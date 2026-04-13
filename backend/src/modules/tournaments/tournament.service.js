const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const { parsePagination } = require('../../common/utils/pagination');
const { createSlug } = require('../../common/utils/slug');
const { TOURNAMENT_STATUS } = require('../../common/constants/tournament');
const { isSuperAdminRole } = require('../../common/constants/roles');
const { assertTournamentAccess } = require('../../common/utils/tournamentAccess');
const tournamentRepository = require('./tournament.repository');
const registrationRepository = require('../registrations/registration.repository');
const matchRepository = require('../matches/match.repository');
const { assignReadyMatchesToTables } = require('../matches/matchScheduling.service');
const Registration = require('../registrations/registration.model');
const Match = require('../matches/match.model');
const RankingHistory = require('../rankings/ranking-history.model');

function createTournamentCode() {
  return `TRN-${Date.now()}`;
}

function nextPowerOfTwo(value) {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function stageLabel(totalRounds, roundNumber) {
  const remainingRounds = totalRounds - roundNumber;
  if (remainingRounds === 0) return 'final';
  if (remainingRounds === 1) return 'semi_final';
  if (remainingRounds === 2) return 'quarter_final';
  if (remainingRounds === 3) return 'round_of_16';
  if (remainingRounds === 4) return 'round_of_32';
  return `round_${roundNumber}`;
}

function formatSkillLevelLabel(skillLevel) {
  return skillLevel || 'Open';
}

function getUnifiedBracketLabel(format) {
  if (format === 'round_robin') return 'League Stage';
  if (format === 'group_knockout') return 'Group Stage';
  if (format === 'double_elimination') return 'Winner Bracket';
  return 'Main Bracket';
}

function formatKnockoutRoundLabel(fieldSize) {
  if (fieldSize <= 2) return 'Final';
  if (fieldSize === 4) return 'Semi-final';
  if (fieldSize === 8) return 'Quarter-final';
  return `Last ${fieldSize}`;
}

function resolveRaceTo(roundNumber, tournament, fallbackRaceTo) {
  const fromRules = (tournament?.raceToRules || []).find((item) => item.roundNumber === roundNumber)?.raceTo;
  return fromRules || fallbackRaceTo || 5;
}

// Helper: map knockout size to stage label
function knockoutSizeToStage(size) {
  const map = { 2: 'last_2', 4: 'last_4', 8: 'last_8', 16: 'last_16', 32: 'last_32', 64: 'last_64', 128: 'last_128' };
  return map[size] || 'last_16';
}

// Helper: map round-robin round number to stage label
function roundRobinRoundToStage(roundNumber) {
  if (roundNumber >= 1 && roundNumber <= 10) {
    return `round_robin_round_${roundNumber}`;
  }
  return 'league_round';
}

// Helper: get knockout round label
function getKnockoutRoundLabel(size) {
  const map = { 2: 'Final', 4: 'Semi-final', 8: 'Quarter-final', 16: 'Last 16', 32: 'Last 32', 64: 'Last 64', 128: 'Last 128' };
  return map[size] || `Last ${size}`;
}

// Helper: calculate player stats from completed matches
async function calculatePlayerStats(tournamentId, matches) {
  const completedMatches = matches.filter((m) => m.status === 'completed');
  const stats = {};

  for (const match of completedMatches) {
    // Process player1
    if (match.player1Id) {
      const p1Id = match.player1Id.toString();
      if (!stats[p1Id]) {
        stats[p1Id] = { playerId: p1Id, wins: 0, losses: 0, racesWon: 0, racesLost: 0 };
      }
      stats[p1Id].racesWon += match.player1Score || 0;
      stats[p1Id].racesLost += match.player2Score || 0;
      if (match.winnerPlayerId && match.winnerPlayerId.toString() === p1Id) {
        stats[p1Id].wins += 1;
      } else if (match.loserPlayerId && match.loserPlayerId.toString() === p1Id) {
        stats[p1Id].losses += 1;
      }
    }
    // Process player2
    if (match.player2Id) {
      const p2Id = match.player2Id.toString();
      if (!stats[p2Id]) {
        stats[p2Id] = { playerId: p2Id, wins: 0, losses: 0, racesWon: 0, racesLost: 0 };
      }
      stats[p2Id].racesWon += match.player2Score || 0;
      stats[p2Id].racesLost += match.player1Score || 0;
      if (match.winnerPlayerId && match.winnerPlayerId.toString() === p2Id) {
        stats[p2Id].wins += 1;
      } else if (match.loserPlayerId && match.loserPlayerId.toString() === p2Id) {
        stats[p2Id].losses += 1;
      }
    }
  }

  // Calculate points (1 point per win) and race diff
  const result = Object.values(stats).map((s) => ({
    ...s,
    points: s.wins,
    raceDiff: s.racesWon - s.racesLost,
    matchesPlayed: s.wins + s.losses,
  }));

  return result;
}

// Helper: select top N qualifiers based on points, tie-break by race diff
function selectQualifiers(stats, playerIds, qualifiersCount) {
  const playerStatsMap = new Map(stats.map((s) => [s.playerId, s]));

  // Build list with all players (including those with 0 stats)
  const allPlayers = playerIds.map((id) => {
    const idStr = id.toString();
    const s = playerStatsMap.get(idStr) || { playerId: idStr, wins: 0, losses: 0, points: 0, racesWon: 0, racesLost: 0, raceDiff: 0, matchesPlayed: 0 };
    return s;
  });

  // Sort by points desc, then raceDiff desc
  allPlayers.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.raceDiff !== a.raceDiff) return b.raceDiff - a.raceDiff;
    return b.racesWon - a.racesWon;
  });

  return allPlayers.slice(0, qualifiersCount).map((p) => p.playerId);
}

function normalizeDoubleEliminationSettings(input = {}) {
  return {
    knockoutStartSize: [128, 64, 32, 16, 8].includes(Number(input.knockoutStartSize || input.drawSize))
      ? Number(input.knockoutStartSize || input.drawSize)
      : 16,
  };
}

function normalizeTableConfig(payload = {}) {
  const tableCount = Math.max(0, Number(payload.tableCount || 0));
  const tvTableCount = Math.min(tableCount, Math.max(0, Number(payload.tvTableCount || 0)));

  return {
    tableCount,
    tvTableCount,
  };
}

async function attachActualPlayerCounts(tournaments) {
  if (!tournaments.length) {
    return tournaments;
  }

  const counts = await registrationRepository.countGroupedByTournament({
    tournamentId: { $in: tournaments.map((item) => item._id) },
    status: 'approved',
  });

  const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

  return tournaments.map((tournament) => {
    const currentPlayerCount = countMap.get(tournament._id.toString()) || 0;

    if (typeof tournament.toObject === 'function') {
      return {
        ...tournament.toObject(),
        approvedPlayerCount: currentPlayerCount,
        currentPlayerCount,
      };
    }

    return {
      ...tournament,
      approvedPlayerCount: currentPlayerCount,
      currentPlayerCount,
    };
  });
}

function buildRoundRobinRounds(playerIds) {
  if (playerIds.length < 2) return [];

  const rotation = [...playerIds];
  if (rotation.length % 2 !== 0) {
    rotation.push(null);
  }

  const rounds = [];
  const totalPlayers = rotation.length;
  const half = totalPlayers / 2;

  for (let roundIndex = 0; roundIndex < totalPlayers - 1; roundIndex += 1) {
    const pairs = [];
    for (let pairIndex = 0; pairIndex < half; pairIndex += 1) {
      const player1Id = rotation[pairIndex];
      const player2Id = rotation[totalPlayers - 1 - pairIndex];
      if (player1Id && player2Id) {
        pairs.push({ player1Id, player2Id });
      }
    }
    rounds.push(pairs);
    rotation.splice(1, 0, rotation.pop());
  }

  return rounds;
}

async function createSingleEliminationBracketGroup({
  tournament,
  tournamentId,
  tournamentStartAt,
  playerIds,
  skillLevel,
  bracketLabel,
  raceTo,
  actorId,
  roundNumberBase = 1,
  roundLabelBuilder = (roundNumber) => `Round ${roundNumber}`,
  stageBuilder = (roundNumber, totalRounds) => stageLabel(totalRounds, roundNumber),
  bracketType = 'main',
  bracketSizeOverride = null,
  autoAdvanceByes = true,
}) {
  const realPlayerCount = playerIds.filter(Boolean).length;
  if (realPlayerCount < 2 && !bracketSizeOverride) {
    return {
      skillLevel,
      bracketLabel,
      players: realPlayerCount,
      matchesCreated: 0,
      totalRounds: 0,
      skipped: true,
      grouped: {},
      createdMatches: [],
    };
  }

  const minimumBracketSize = nextPowerOfTwo(Math.max(realPlayerCount, 2));
  const bracketSize = Math.max(bracketSizeOverride || minimumBracketSize, minimumBracketSize);
  const totalRounds = Math.log2(bracketSize);
  const slots = [...playerIds, ...Array(bracketSize - playerIds.length).fill(null)];
  const matches = [];

  for (let localRoundNumber = 1; localRoundNumber <= totalRounds; localRoundNumber += 1) {
    const actualRoundNumber = roundNumberBase + localRoundNumber - 1;
    const matchCount = bracketSize / (2 ** localRoundNumber);
    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      let player1Id = null;
      let player2Id = null;

      if (localRoundNumber === 1) {
        player1Id = slots[(matchNumber - 1) * 2] || null;
        player2Id = slots[((matchNumber - 1) * 2) + 1] || null;
      }

      matches.push({
        tournamentId,
        skillLevel,
        bracketLabel,
        roundNumber: actualRoundNumber,
        roundLabel: roundLabelBuilder(localRoundNumber, bracketSize / (2 ** (localRoundNumber - 1)), totalRounds, bracketSize),
        stage: stageBuilder(localRoundNumber, totalRounds),
        bracketType,
        matchNumber,
        raceTo: resolveRaceTo(localRoundNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id,
        player2Id,
        status: player1Id && player2Id ? 'ready' : 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });
    }
  }

  const createdMatches = await matchRepository.createMany(matches);
  const grouped = createdMatches.reduce((acc, match) => {
    const localRoundNumber = match.roundNumber - roundNumberBase + 1;
    if (!acc[localRoundNumber]) acc[localRoundNumber] = [];
    acc[localRoundNumber].push(match);
    return acc;
  }, {});

  for (let localRoundNumber = 1; localRoundNumber < totalRounds; localRoundNumber += 1) {
    const currentRound = grouped[localRoundNumber].sort((a, b) => a.matchNumber - b.matchNumber);
    const nextRound = grouped[localRoundNumber + 1].sort((a, b) => a.matchNumber - b.matchNumber);

    for (let index = 0; index < currentRound.length; index += 1) {
      const nextMatch = nextRound[Math.floor(index / 2)];
      currentRound[index].nextMatchId = nextMatch._id;
      currentRound[index].nextMatchSlot = (index % 2) + 1;
      await currentRound[index].save();
    }
  }

  if (autoAdvanceByes && grouped[1]) {
    for (const firstRoundMatch of grouped[1]) {
      if (firstRoundMatch.player1Id && !firstRoundMatch.player2Id) {
        const nextMatch = await matchRepository.findById(firstRoundMatch.nextMatchId);
        if (nextMatch) {
          nextMatch[`player${firstRoundMatch.nextMatchSlot}Id`] = firstRoundMatch.player1Id;
          nextMatch.status = nextMatch.player1Id && nextMatch.player2Id ? 'ready' : nextMatch.status;
          await nextMatch.save();
        }
        firstRoundMatch.winnerPlayerId = firstRoundMatch.player1Id;
        firstRoundMatch.status = 'completed';
        firstRoundMatch.completedAt = new Date();
        await firstRoundMatch.save();
      }

      if (!firstRoundMatch.player1Id && firstRoundMatch.player2Id) {
        const nextMatch = await matchRepository.findById(firstRoundMatch.nextMatchId);
        if (nextMatch) {
          nextMatch[`player${firstRoundMatch.nextMatchSlot}Id`] = firstRoundMatch.player2Id;
          nextMatch.status = nextMatch.player1Id && nextMatch.player2Id ? 'ready' : nextMatch.status;
          await nextMatch.save();
        }
        firstRoundMatch.winnerPlayerId = firstRoundMatch.player2Id;
        firstRoundMatch.status = 'completed';
        firstRoundMatch.completedAt = new Date();
        await firstRoundMatch.save();
      }
    }
  }

  return {
    skillLevel,
    bracketLabel,
    players: realPlayerCount,
    matchesCreated: createdMatches.length,
    totalRounds,
    skipped: false,
    grouped,
    createdMatches,
  };
}

async function createRoundRobinBracketGroup({
  tournament,
  tournamentId,
  tournamentStartAt,
  playerIds,
  skillLevel,
  bracketLabel,
  raceTo,
  actorId,
  roundNumberBase = 300,
  roundLabelBuilder = (roundNumber) => `Round ${roundNumber}`,
  roundRobinRounds = 1, // Number of full round-robin cycles
}) {
  const singleRound = buildRoundRobinRounds(playerIds);
  if (!singleRound.length) {
    return {
      skillLevel,
      bracketLabel,
      players: playerIds.length,
      matchesCreated: 0,
      totalRounds: 0,
      skipped: true,
    };
  }

  // Generate N rounds of round-robin
  const allRounds = [];
  for (let cycle = 0; cycle < roundRobinRounds; cycle += 1) {
    // For each cycle, rotate starting position to vary home/away
    const rotation = [...playerIds];
    if (cycle > 0) {
      // Swap positions for variety in subsequent rounds
      for (let i = 0; i < cycle && rotation.length > 1; i += 1) {
        const temp = rotation[0];
        rotation[0] = rotation[rotation.length - 1];
        rotation[rotation.length - 1] = temp;
      }
    }
    const cycleRounds = buildRoundRobinRounds(rotation);
    allRounds.push(...cycleRounds);
  }

  const matches = [];
  let matchNumber = 1;
  allRounds.forEach((pairs, roundIndex) => {
    const cycleNumber = Math.floor(roundIndex / singleRound.length) + 1;
    const roundInCycle = (roundIndex % singleRound.length) + 1;
    const stageLabel = roundRobinRoundToStage(cycleNumber);

    pairs.forEach((pair) => {
      matches.push({
        tournamentId,
        skillLevel,
        bracketLabel,
        roundNumber: roundNumberBase + roundIndex,
        roundLabel: roundLabelBuilder(cycleNumber, roundInCycle),
        stage: stageLabel,
        bracketType: 'main',
        matchNumber,
        raceTo: resolveRaceTo(cycleNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id: pair.player1Id,
        player2Id: pair.player2Id,
        status: pair.player1Id && pair.player2Id ? 'ready' : 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });
      matchNumber += 1;
    });
  });

  const createdMatches = await matchRepository.createMany(matches);
  return {
    skillLevel,
    bracketLabel,
    players: playerIds.length,
    matchesCreated: createdMatches.length,
    totalRounds: allRounds.length,
    roundRobinRounds,
    skipped: false,
    createdMatches,
  };
}

// Create knockout bracket for round-robin qualifiers
async function createRoundRobinKnockoutBracket({
  tournament,
  tournamentId,
  tournamentStartAt,
  qualifierPlayerIds,
  skillLevel,
  bracketLabel,
  raceTo,
  actorId,
  knockoutStartRound, // e.g., 16 = Last 16
  roundNumberBase = 500,
}) {
  if (!qualifierPlayerIds || qualifierPlayerIds.length < 2) {
    return {
      skillLevel,
      bracketLabel,
      qualifiersCount: 0,
      matchesCreated: 0,
      skipped: true,
    };
  }

  // Determine bracket size: next power of 2 >= qualifier count, capped at knockoutStartRound
  const bracketSize = Math.min(
    nextPowerOfTwo(qualifierPlayerIds.length),
    knockoutStartRound || qualifierPlayerIds.length,
  );

  // Calculate total rounds in knockout
  const totalKnockoutRounds = Math.log2(bracketSize);

  // Pad qualifiers with nulls if needed
  const slots = [...qualifierPlayerIds, ...Array(bracketSize - qualifierPlayerIds.length).fill(null)];
  const matches = [];

  for (let localRoundNumber = 1; localRoundNumber <= totalKnockoutRounds; localRoundNumber += 1) {
    const matchCount = bracketSize / (2 ** localRoundNumber);
    const fieldSize = bracketSize / (2 ** (localRoundNumber - 1));
    const stageLabel = knockoutSizeToStage(fieldSize);
    const roundLabel = getKnockoutRoundLabel(fieldSize);

    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      let player1Id = null;
      let player2Id = null;

      if (localRoundNumber === 1) {
        player1Id = slots[(matchNumber - 1) * 2] || null;
        player2Id = slots[((matchNumber - 1) * 2) + 1] || null;
      }

      matches.push({
        tournamentId,
        skillLevel,
        bracketLabel,
        roundNumber: roundNumberBase + localRoundNumber - 1,
        roundLabel,
        stage: stageLabel,
        bracketType: 'final',
        matchNumber,
        raceTo: resolveRaceTo(localRoundNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id,
        player2Id,
        status: player1Id && player2Id ? 'ready' : 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });
    }
  }

  const createdMatches = await matchRepository.createMany(matches);

  // Link matches (winner advances)
  const grouped = createdMatches.reduce((acc, match) => {
    const localRoundNumber = match.roundNumber - roundNumberBase + 1;
    if (!acc[localRoundNumber]) acc[localRoundNumber] = [];
    acc[localRoundNumber].push(match);
    return acc;
  }, {});

  for (let localRoundNumber = 1; localRoundNumber < totalKnockoutRounds; localRoundNumber += 1) {
    const currentRound = grouped[localRoundNumber].sort((a, b) => a.matchNumber - b.matchNumber);
    const nextRound = grouped[localRoundNumber + 1].sort((a, b) => a.matchNumber - b.matchNumber);

    for (let index = 0; index < currentRound.length; index += 1) {
      const nextMatch = nextRound[Math.floor(index / 2)];
      currentRound[index].nextMatchId = nextMatch._id;
      currentRound[index].nextMatchSlot = (index % 2) + 1;
      await currentRound[index].save();
    }
  }

  // Auto-advance byes
  for (const firstRoundMatch of grouped[1] || []) {
    if (firstRoundMatch.player1Id && !firstRoundMatch.player2Id) {
      const nextMatch = await matchRepository.findById(firstRoundMatch.nextMatchId);
      if (nextMatch) {
        nextMatch[`player${firstRoundMatch.nextMatchSlot}Id`] = firstRoundMatch.player1Id;
        nextMatch.status = nextMatch.player1Id && nextMatch.player2Id ? 'ready' : nextMatch.status;
        await nextMatch.save();
      }
      firstRoundMatch.winnerPlayerId = firstRoundMatch.player1Id;
      firstRoundMatch.status = 'completed';
      firstRoundMatch.completedAt = new Date();
      await firstRoundMatch.save();
    }
    if (!firstRoundMatch.player1Id && firstRoundMatch.player2Id) {
      const nextMatch = await matchRepository.findById(firstRoundMatch.nextMatchId);
      if (nextMatch) {
        nextMatch[`player${firstRoundMatch.nextMatchSlot}Id`] = firstRoundMatch.player2Id;
        nextMatch.status = nextMatch.player1Id && nextMatch.player2Id ? 'ready' : nextMatch.status;
        await nextMatch.save();
      }
      firstRoundMatch.winnerPlayerId = firstRoundMatch.player2Id;
      firstRoundMatch.status = 'completed';
      firstRoundMatch.completedAt = new Date();
      await firstRoundMatch.save();
    }
  }

  return {
    skillLevel,
    bracketLabel,
    qualifiersCount: qualifierPlayerIds.length,
    matchesCreated: createdMatches.length,
    totalKnockoutRounds,
    bracketSize,
    skipped: false,
  };
}

async function autoResolveByeMatches(matchIds = []) {
  if (!matchIds.length) {
    return;
  }

  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;

    for (const matchId of matchIds) {
      const match = await matchRepository.findById(matchId);
      if (!match || match.status === 'completed') continue;

      const onlyPlayer1 = match.player1Id && !match.player2Id;
      const onlyPlayer2 = !match.player1Id && match.player2Id;

      if (!onlyPlayer1 && !onlyPlayer2) {
        continue;
      }

      const winnerPlayerId = onlyPlayer1 ? match.player1Id : match.player2Id;

      if (match.nextMatchId) {
        const nextMatch = await matchRepository.findById(match.nextMatchId);
        if (nextMatch) {
          nextMatch[`player${match.nextMatchSlot}Id`] = winnerPlayerId;
          nextMatch.status = nextMatch.player1Id && nextMatch.player2Id ? 'ready' : nextMatch.status;
          await nextMatch.save();
        }
      }

      match.winnerPlayerId = winnerPlayerId;
      match.status = 'completed';
      match.completedAt = new Date();
      await match.save();
      madeProgress = true;
    }
  }
}

async function createDoubleEliminationBracketGroup({
  tournament,
  tournamentId,
  tournamentStartAt,
  registrations,
  skillLevel,
  raceTo,
  actorId,
}) {
  const playerIds = registrations.map((item) => item.playerId);
  if (playerIds.length < 2) {
    return {
      skillLevel,
      bracketLabel: formatSkillLevelLabel(skillLevel),
      players: playerIds.length,
      matchesCreated: 0,
      totalRounds: 0,
      skipped: true,
    };
  }

  const knockoutStartSize = Number(tournament.bracketSettings?.knockoutStartSize || 16);
  const qualifierBaseSize = nextPowerOfTwo(playerIds.length);

  if (qualifierBaseSize <= knockoutStartSize) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      errorCodes.BAD_REQUEST,
      `Double elimination qualifier needs more than ${knockoutStartSize} approved players to feed a Last ${knockoutStartSize} knockout`,
    );
  }

  if (qualifierBaseSize % knockoutStartSize !== 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      errorCodes.BAD_REQUEST,
      'Knockout start size must divide the qualifier field evenly in double elimination mode',
    );
  }

  const qualifierSteps = Math.log2(qualifierBaseSize / knockoutStartSize);
  const qualifierSlots = [...playerIds, ...Array(qualifierBaseSize - playerIds.length).fill(null)];
  const winnerRounds = [];
  const loserRounds = [];

  for (let roundNumber = 1; roundNumber <= qualifierSteps + 1; roundNumber += 1) {
    const matchCount = qualifierBaseSize / (2 ** roundNumber);
    const winnerRoundDrafts = [];

    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      winnerRoundDrafts.push({
        tournamentId,
        skillLevel,
        bracketLabel: 'Winner Bracket',
        roundNumber,
        roundLabel: `Round ${roundNumber}`,
        stage: 'qualifier',
        bracketType: 'main',
        matchNumber,
        raceTo: resolveRaceTo(roundNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id: roundNumber === 1 ? qualifierSlots[(matchNumber - 1) * 2] || null : null,
        player2Id: roundNumber === 1 ? qualifierSlots[((matchNumber - 1) * 2) + 1] || null : null,
        status: roundNumber === 1 && qualifierSlots[(matchNumber - 1) * 2] && qualifierSlots[((matchNumber - 1) * 2) + 1] ? 'ready' : 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });
    }

    winnerRounds[roundNumber] = await matchRepository.createMany(winnerRoundDrafts);
  }

  for (let step = 1; step <= qualifierSteps; step += 1) {
    const matchCount = qualifierBaseSize / (2 ** (step + 1));
    const oddRoundNumber = (step * 2) - 1;
    const evenRoundNumber = step * 2;
    const loserOddDrafts = [];
    const loserEvenDrafts = [];

    for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
      loserOddDrafts.push({
        tournamentId,
        skillLevel,
        bracketLabel: 'Loser Bracket',
        roundNumber: 100 + oddRoundNumber,
        roundLabel: `Loser Round ${oddRoundNumber}`,
        stage: 'loser_round',
        bracketType: 'loser',
        matchNumber,
        raceTo: resolveRaceTo(100 + oddRoundNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id: null,
        player2Id: null,
        status: 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });

      loserEvenDrafts.push({
        tournamentId,
        skillLevel,
        bracketLabel: 'Loser Bracket',
        roundNumber: 100 + evenRoundNumber,
        roundLabel: `Loser Round ${evenRoundNumber}`,
        stage: 'loser_round',
        bracketType: 'loser',
        matchNumber,
        raceTo: resolveRaceTo(100 + evenRoundNumber, tournament, raceTo),
        scheduledAt: tournamentStartAt || null,
        player1Id: null,
        player2Id: null,
        status: 'scheduled',
        createdBy: actorId,
        updatedBy: actorId,
      });
    }

    loserRounds[oddRoundNumber] = await matchRepository.createMany(loserOddDrafts);
    loserRounds[evenRoundNumber] = await matchRepository.createMany(loserEvenDrafts);
  }

  const knockoutBracket = await createSingleEliminationBracketGroup({
    tournament,
    tournamentId,
    tournamentStartAt,
    playerIds: [],
    skillLevel,
    bracketLabel: 'Knockout Bracket',
    raceTo,
    actorId,
    roundNumberBase: 200,
    roundLabelBuilder: (roundNumber, fieldSize) => formatKnockoutRoundLabel(fieldSize),
    bracketType: 'final',
    bracketSizeOverride: knockoutStartSize,
    autoAdvanceByes: false,
  });

  const knockoutFirstRound = (knockoutBracket.grouped[1] || []).sort((a, b) => a.matchNumber - b.matchNumber);

  for (let roundNumber = 1; roundNumber <= qualifierSteps + 1; roundNumber += 1) {
    const currentRound = (winnerRounds[roundNumber] || []).sort((a, b) => a.matchNumber - b.matchNumber);
    const nextWinnerRound = (winnerRounds[roundNumber + 1] || []).sort((a, b) => a.matchNumber - b.matchNumber);

    for (let index = 0; index < currentRound.length; index += 1) {
      const match = currentRound[index];

      if (roundNumber <= qualifierSteps) {
        const loserOddRound = (loserRounds[(roundNumber * 2) - 1] || []).sort((a, b) => a.matchNumber - b.matchNumber);
        const loserTarget = loserOddRound[Math.floor(index / 2)];
        if (loserTarget) {
          match.loserNextMatchId = loserTarget._id;
          match.loserNextMatchSlot = (index % 2) + 1;
        }
      }

      if (nextWinnerRound.length) {
        const nextWinnerMatch = nextWinnerRound[Math.floor(index / 2)];
        if (nextWinnerMatch) {
          match.nextMatchId = nextWinnerMatch._id;
          match.nextMatchSlot = (index % 2) + 1;
        }
      } else {
        const knockoutTarget = knockoutFirstRound[index];
        if (knockoutTarget) {
          match.nextMatchId = knockoutTarget._id;
          match.nextMatchSlot = 1;
        }
      }

      await match.save();
    }
  }

  for (let step = 1; step <= qualifierSteps; step += 1) {
    const oddRoundNumber = (step * 2) - 1;
    const evenRoundNumber = step * 2;
    const oddRound = (loserRounds[oddRoundNumber] || []).sort((a, b) => a.matchNumber - b.matchNumber);
    const evenRound = (loserRounds[evenRoundNumber] || []).sort((a, b) => a.matchNumber - b.matchNumber);

    for (let index = 0; index < oddRound.length; index += 1) {
      const match = oddRound[index];
      const evenTarget = evenRound[index];

      if (step > 1) {
        const previousEvenRound = (loserRounds[evenRoundNumber - 2] || []).sort((a, b) => a.matchNumber - b.matchNumber);
        const sourceMatch = previousEvenRound[(index * 2)] || null;
        const altSourceMatch = previousEvenRound[(index * 2) + 1] || null;

        if (sourceMatch) {
          sourceMatch.nextMatchId = match._id;
          sourceMatch.nextMatchSlot = 1;
          await sourceMatch.save();
        }

        if (altSourceMatch) {
          altSourceMatch.nextMatchId = match._id;
          altSourceMatch.nextMatchSlot = 2;
          await altSourceMatch.save();
        }
      }

      if (evenTarget) {
        match.nextMatchId = evenTarget._id;
        match.nextMatchSlot = 1;
      }

      await match.save();
    }

    const winnerSourceRound = (winnerRounds[step + 1] || []).sort((a, b) => a.matchNumber - b.matchNumber);
    for (let index = 0; index < winnerSourceRound.length; index += 1) {
      const winnerMatch = winnerSourceRound[index];
      const evenTarget = evenRound[index];
      if (evenTarget) {
        winnerMatch.loserNextMatchId = evenTarget._id;
        winnerMatch.loserNextMatchSlot = 2;
        await winnerMatch.save();
      }
    }

    for (let index = 0; index < evenRound.length; index += 1) {
      const match = evenRound[index];
      if (step === qualifierSteps) {
        const knockoutTarget = knockoutFirstRound[index];
        if (knockoutTarget) {
          match.nextMatchId = knockoutTarget._id;
          match.nextMatchSlot = 2;
        }
      }
      await match.save();
    }
  }

  await autoResolveByeMatches([
    ...winnerRounds.flatMap((round) => round || []).map((match) => match._id),
    ...loserRounds.flatMap((round) => round || []).map((match) => match._id),
    ...knockoutBracket.createdMatches.map((match) => match._id),
  ]);

  return {
    skillLevel,
    bracketLabel: formatSkillLevelLabel(skillLevel),
    players: playerIds.length,
    matchesCreated:
      winnerRounds.flatMap((round) => round || []).length
      + loserRounds.flatMap((round) => round || []).length
      + knockoutBracket.matchesCreated,
    totalRounds: (qualifierSteps + 1) + (qualifierSteps * 2) + knockoutBracket.totalRounds,
    skipped: false,
  };
}

async function createGroupKnockoutBracketGroup({
  tournament,
  tournamentId,
  tournamentStartAt,
  registrations,
  skillLevel,
  raceTo,
  actorId,
}) {
  const playerIds = registrations.map((item) => item.playerId);
  if (playerIds.length < 2) {
    return {
      skillLevel,
      bracketLabel: formatSkillLevelLabel(skillLevel),
      players: playerIds.length,
      matchesCreated: 0,
      totalRounds: 0,
      skipped: true,
    };
  }

  const groupSize = 4;
  const groups = [];
  for (let index = 0; index < playerIds.length; index += groupSize) {
    groups.push(playerIds.slice(index, index + groupSize));
  }

  let matchesCreated = 0;
  for (let index = 0; index < groups.length; index += 1) {
    const groupLabel = `Group ${String.fromCharCode(65 + index)}`;
    const groupResult = await createRoundRobinBracketGroup({
      tournament,
      tournamentId,
      tournamentStartAt,
      playerIds: groups[index],
      skillLevel,
      bracketLabel: groupLabel,
      raceTo,
      actorId,
      roundNumberBase: 300 + (index * 20),
      stage: 'group_stage',
      roundLabelBuilder: (roundNumber) => `${groupLabel} - Round ${roundNumber}`,
    });
    matchesCreated += groupResult.matchesCreated;
  }

  const qualifiedSlots = groups.reduce((sum, group) => sum + (group.length >= 4 ? 2 : 1), 0);
  if (qualifiedSlots >= 2) {
    const knockoutResult = await createSingleEliminationBracketGroup({
      tournament,
      tournamentId,
      tournamentStartAt,
      playerIds: [],
      skillLevel,
      bracketLabel: 'Knockout Bracket',
      raceTo,
      actorId,
      roundNumberBase: 400,
      roundLabelBuilder: (roundNumber, fieldSize) => formatKnockoutRoundLabel(fieldSize),
      bracketType: 'main',
      bracketSizeOverride: nextPowerOfTwo(qualifiedSlots),
      autoAdvanceByes: false,
    });
    matchesCreated += knockoutResult.matchesCreated;
  }

  return {
    skillLevel,
    bracketLabel: formatSkillLevelLabel(skillLevel),
    players: playerIds.length,
    matchesCreated,
    totalRounds: groups.length,
    skipped: false,
  };
}

async function createTournament(payload, actor) {
  const ownerAdminId = isSuperAdminRole(actor.role)
    ? (payload.ownerAdminId || actor.sub)
    : actor.sub;
  const format = payload.format || 'single_elimination';
  const tableConfig = normalizeTableConfig(payload);

  return tournamentRepository.create({
    ...payload,
    format,
    bracketSettings: format === 'double_elimination'
      ? normalizeDoubleEliminationSettings(payload.bracketSettings)
      : {},
    ownerAdminId,
    managerAdminIds: isSuperAdminRole(actor.role) ? (payload.managerAdminIds || []) : [],
    ...tableConfig,
    raceToRules: (payload.raceToRules || []).sort((left, right) => left.roundNumber - right.roundNumber),
    code: createTournamentCode(),
    slug: `${createSlug(payload.name)}-${Date.now()}`,
    createdBy: actor.sub,
    updatedBy: actor.sub,
  });
}

async function listTournaments(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 500 });
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.gameType) filter.gameType = query.gameType;
  if (query.city) filter['venue.city'] = { $regex: query.city, $options: 'i' };
  if (query.minPrizeFund !== undefined || query.maxPrizeFund !== undefined) {
    filter.prizeFund = {};
    if (query.minPrizeFund !== undefined) filter.prizeFund.$gte = Number(query.minPrizeFund);
    if (query.maxPrizeFund !== undefined) filter.prizeFund.$lte = Number(query.maxPrizeFund);
  }
  if (query.minChampionPrize !== undefined) {
    filter.prizeStructure = {
      $elemMatch: {
        position: 1,
        amount: { $gte: Number(query.minChampionPrize) },
      },
    };
  }
  if (query.keyword) {
    filter.$or = [
      { name: { $regex: query.keyword, $options: 'i' } },
      { 'venue.name': { $regex: query.keyword, $options: 'i' } },
      { 'venue.city': { $regex: query.keyword, $options: 'i' } },
    ];
  }
  if (query.fromDate || query.toDate) {
    filter.startAt = {};
    if (query.fromDate) filter.startAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.startAt.$lte = new Date(query.toDate);
  }

  const [items, total] = await Promise.all([
    tournamentRepository.findMany(filter, { skip, limit }),
    tournamentRepository.countDocuments(filter),
  ]);

  const itemsWithCounts = await attachActualPlayerCounts(items);

  return { items: itemsWithCounts, meta: { page, limit, total } };
}

async function listOpenRegistration(query) {
  return listTournaments({ ...query, status: TOURNAMENT_STATUS.OPEN_REGISTRATION });
}

async function listHistory(query) {
  return listTournaments({ ...query, status: TOURNAMENT_STATUS.FINISHED });
}

async function listManageableTournaments(query, actor) {
  if (isSuperAdminRole(actor.role)) {
    return listTournaments(query);
  }

  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 500 });
  const filter = {
    $or: [
      { ownerAdminId: actor.sub },
      { managerAdminIds: actor.sub },
    ],
  };

  const [items, total] = await Promise.all([
    tournamentRepository.findMany(filter, { skip, limit }),
    tournamentRepository.countDocuments(filter),
  ]);

  const itemsWithCounts = await attachActualPlayerCounts(items);

  return { items: itemsWithCounts, meta: { page, limit, total } };
}

async function listDeletedTournaments(query, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only total admins can access tournament trash');
  }

  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 500 });
  const filter = { deletedAt: { $ne: null } };

  if (query.keyword) {
    filter.name = { $regex: query.keyword, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    tournamentRepository.findManyIncludingDeleted(filter, { skip, limit, sort: { deletedAt: -1 } }),
    tournamentRepository.countDocumentsIncludingDeleted(filter),
  ]);

  const itemsWithCounts = await attachActualPlayerCounts(items);

  return { items: itemsWithCounts, meta: { page, limit, total } };
}

async function getTournamentById(id) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }

  const [approvedPlayers, matches] = await Promise.all([
    registrationRepository.findMany(
      { tournamentId: id, status: 'approved' },
      { sort: { skillLevel: 1, seedingNumber: 1, registeredAt: 1 }, limit: 200, populatePlayer: true },
    ),
    matchRepository.findMany(
      { tournamentId: id },
      { sort: { skillLevel: 1, roundNumber: 1, matchNumber: 1 }, limit: 2000, populatePlayers: true },
    ),
  ]);

  return {
    tournament,
    approvedPlayers,
    matches,
    upcomingMatches: matches,
  };
}

async function updateTournament(id, payload, actor) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  if (payload.name && payload.name !== tournament.name) {
    payload.slug = `${createSlug(payload.name)}-${Date.now()}`;
  }
  if (payload.raceToRules) {
    payload.raceToRules = payload.raceToRules.sort((left, right) => left.roundNumber - right.roundNumber);
  }
  if (payload.format === 'double_elimination') {
    payload.bracketSettings = normalizeDoubleEliminationSettings(payload.bracketSettings || tournament.bracketSettings);
  } else if (payload.format && payload.format !== 'double_elimination') {
    payload.bracketSettings = {};
  } else if (payload.bracketSettings && tournament.format === 'double_elimination') {
    payload.bracketSettings = normalizeDoubleEliminationSettings(payload.bracketSettings);
  }
  if (payload.ownerAdminId && !isSuperAdminRole(actor.role)) {
    delete payload.ownerAdminId;
  }
  if (payload.managerAdminIds && !isSuperAdminRole(actor.role)) {
    delete payload.managerAdminIds;
  }
  if (payload.tableCount !== undefined || payload.tvTableCount !== undefined) {
    Object.assign(payload, normalizeTableConfig({
      tableCount: payload.tableCount ?? tournament.tableCount,
      tvTableCount: payload.tvTableCount ?? tournament.tvTableCount,
    }));
  }

  Object.assign(tournament, payload, { updatedBy: actor.sub });
  await tournament.save();
  return tournament;
}

async function updateTournamentStatus(id, status, actor) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  tournament.status = status;
  tournament.updatedBy = actor.sub;
  if (status === TOURNAMENT_STATUS.FINISHED && !tournament.endAt) {
    tournament.endAt = new Date();
  }
  await tournament.save();
  return tournament;
}

async function deleteTournament(id, actor) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  if (tournament.status === TOURNAMENT_STATUS.ONGOING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Cannot delete an ongoing tournament');
  }

  tournament.deletedAt = new Date();
  tournament.deletedBy = actor.sub;
  await tournament.save();
}

async function restoreTournament(id, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only total admins can restore tournaments');
  }

  const tournament = await tournamentRepository.findByIdIncludingDeleted(id);
  if (!tournament || !tournament.deletedAt) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Deleted tournament not found');
  }

  tournament.deletedAt = null;
  tournament.deletedBy = null;
  tournament.updatedBy = actor.sub;
  await tournament.save();
  return tournament;
}

async function deleteTournamentPermanently(id, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only total admins can permanently delete tournaments');
  }

  const tournament = await tournamentRepository.findByIdIncludingDeleted(id);
  if (!tournament || !tournament.deletedAt) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Deleted tournament not found');
  }

  await Promise.all([
    Registration.deleteMany({ tournamentId: tournament._id }),
    Match.deleteMany({ tournamentId: tournament._id }),
    RankingHistory.deleteMany({ tournamentId: tournament._id }),
    tournamentRepository.deletePermanently(tournament._id),
  ]);
}


async function generateBracket(id, payload, actor) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  if (tournament.status !== TOURNAMENT_STATUS.CLOSED_REGISTRATION) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Tournament must be closed registration before bracket generation');
  }
  if (tournament.bracketGeneratedAt) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Bracket already generated');
  }

  const registrations = await registrationRepository.findMany(
    { tournamentId: id, status: 'approved' },
    {
      sort: payload.seedingMode === 'ranking'
        ? { 'snapshot.rankingPoints': -1, registeredAt: 1 }
        : { registeredAt: 1 },
      limit: 512,
    },
  );

  if (registrations.length < 2) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'At least 2 approved players are required');
  }

  const unifiedSkillLevel = null;
  const unifiedBracketLabel = getUnifiedBracketLabel(tournament.format);
  const bracketGroups = [];
  let result = null;

  if (tournament.format === 'single_elimination') {
    result = await createSingleEliminationBracketGroup({
      tournament,
      tournamentId: tournament._id,
      tournamentStartAt: tournament.startAt,
      playerIds: registrations.map((item) => item.playerId),
      skillLevel: unifiedSkillLevel,
      bracketLabel: unifiedBracketLabel,
      raceTo: payload.raceTo,
      actorId: actor.sub,
      roundLabelBuilder: (roundNumber, fieldSize) => formatKnockoutRoundLabel(fieldSize),
    });
  } else if (tournament.format === 'double_elimination') {
    result = await createDoubleEliminationBracketGroup({
      tournament,
      tournamentId: tournament._id,
      tournamentStartAt: tournament.startAt,
      registrations,
      skillLevel: unifiedSkillLevel,
      raceTo: payload.raceTo,
      actorId: actor.sub,
    });
  } else if (tournament.format === 'round_robin') {
    const roundRobinRounds = tournament.bracketSettings?.roundRobinRounds || 1;
    const qualifiersCount = tournament.bracketSettings?.qualifiersCount || null;
    const knockoutStartRound = tournament.bracketSettings?.knockoutStartRound || null;

    result = await createRoundRobinBracketGroup({
      tournament,
      tournamentId: tournament._id,
      tournamentStartAt: tournament.startAt,
      playerIds: registrations.map((item) => item.playerId),
      skillLevel: unifiedSkillLevel,
      bracketLabel: unifiedBracketLabel,
      raceTo: payload.raceTo,
      actorId: actor.sub,
      roundRobinRounds,
      roundLabelBuilder: (cycleNumber, roundInCycle) => `Round ${cycleNumber} - Flight ${roundInCycle}`,
    });

    if (qualifiersCount && qualifiersCount >= 2) {
      const allMatches = result.createdMatches || [];
      const playerIds = registrations.map((item) => item.playerId);
      const stats = await calculatePlayerStats(tournament._id, allMatches);
      const qualifierPlayerIds = selectQualifiers(stats, playerIds, qualifiersCount);

      const knockoutResult = await createRoundRobinKnockoutBracket({
        tournament,
        tournamentId: tournament._id,
        tournamentStartAt: tournament.startAt,
        qualifierPlayerIds,
        skillLevel: unifiedSkillLevel,
        bracketLabel: 'Knockout Bracket',
        raceTo: payload.raceTo,
        actorId: actor.sub,
        knockoutStartRound,
      });

      if (!result.skipped) {
        result.knockoutResult = knockoutResult;
        result.matchesCreated += knockoutResult.matchesCreated || 0;
      }
    }
  } else if (tournament.format === 'group_knockout') {
    result = await createGroupKnockoutBracketGroup({
      tournament,
      tournamentId: tournament._id,
      tournamentStartAt: tournament.startAt,
      registrations,
      skillLevel: unifiedSkillLevel,
      raceTo: payload.raceTo,
      actorId: actor.sub,
    });
  }

  if (result) {
    bracketGroups.push(result);
  }

  tournament.bracketGeneratedAt = new Date();
  tournament.updatedBy = actor.sub;
  await tournament.save();
  await assignReadyMatchesToTables(tournament);

  return {
    matchesCreated: bracketGroups.reduce((sum, item) => sum + item.matchesCreated, 0),
    bracketGroups,
  };
}

// Regenerate bracket (delete existing matches and create new ones)
async function regenerateBracket(id, payload, actor) {
  const tournament = await tournamentRepository.findById(id);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  if (tournament.status !== TOURNAMENT_STATUS.CLOSED_REGISTRATION) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Tournament must be closed registration before bracket regeneration');
  }
  if (!tournament.bracketGeneratedAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'No bracket to regenerate');
  }

  // Delete all existing matches for this tournament
  await matchRepository.deleteMany({ tournamentId: tournament._id });

  // Reset bracketGeneratedAt so generateBracket can run again
  tournament.bracketGeneratedAt = null;
  await tournament.save();

  // Generate new bracket
  return generateBracket(id, payload, actor);
}

// Get player stats for a tournament (for round-robin standings)
async function getPlayerStats(tournamentId) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }

  // Get approved players
  const registrations = await registrationRepository.findMany(
    { tournamentId, status: 'approved' },
    { sort: { skillLevel: 1, registeredAt: 1 }, limit: 500, populatePlayer: true },
  );

  // Get all matches for this tournament
  const matches = await matchRepository.findMany(
    { tournamentId },
    { sort: { skillLevel: 1, roundNumber: 1, matchNumber: 1 }, limit: 5000, populatePlayers: true },
  );

  // Calculate stats from all matches
  const allStats = await calculatePlayerStats(tournamentId, matches);
  const statsMap = new Map(allStats.map((s) => [s.playerId, s]));

  // Build full player list with stats (no skill level grouping)
  const playerStats = registrations.map((reg) => {
    const playerIdStr = reg.playerId.toString();
    const s = statsMap.get(playerIdStr) || {
      playerId: playerIdStr,
      wins: 0,
      losses: 0,
      points: 0,
      racesWon: 0,
      racesLost: 0,
      raceDiff: 0,
      matchesPlayed: 0,
    };

    return {
      playerId: reg.playerId,
      player: reg.player || null,
      skillLevel: reg.skillLevel || 'Open',
      seedingNumber: reg.seedingNumber || null,
      wins: s.wins,
      losses: s.losses,
      points: s.points,
      racesWon: s.racesWon,
      racesLost: s.racesLost,
      raceDiff: s.raceDiff,
      matchesPlayed: s.matchesPlayed,
    };
  });

  // Sort by points desc, raceDiff desc, racesWon desc
  playerStats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.raceDiff !== a.raceDiff) return b.raceDiff - a.raceDiff;
    return b.racesWon - a.racesWon;
  });

  // Add rank
  playerStats.forEach((p, index) => {
    p.rank = index + 1;
  });

  return playerStats;
}

module.exports = {
  createTournament,
  listTournaments,
  listOpenRegistration,
  listHistory,
  listManageableTournaments,
  listDeletedTournaments,
  getTournamentById,
  updateTournament,
  updateTournamentStatus,
  deleteTournament,
  restoreTournament,
  deleteTournamentPermanently,
  generateBracket,
  regenerateBracket,
  getPlayerStats,
};


