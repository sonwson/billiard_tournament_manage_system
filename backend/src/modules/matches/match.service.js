const { StatusCodes } = require('http-status-codes');
const crypto = require('crypto');
const QRCode = require('qrcode');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const env = require('../../config/env');
const { parsePagination } = require('../../common/utils/pagination');
const matchRepository = require('./match.repository');
const tournamentRepository = require('../tournaments/tournament.repository');
const registrationRepository = require('../registrations/registration.repository');
const rankingService = require('../rankings/ranking.service');
const { assertTournamentAccess } = require('../../common/utils/tournamentAccess');
const { assignReadyMatchesToTables, buildTournamentTableLabels } = require('./matchScheduling.service');

async function listByTournament(tournamentId, query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 100, maxLimit: 2000 });
  const filter = { tournamentId };
  if (query.status) filter.status = query.status;
  if (query.roundNumber) filter.roundNumber = Number(query.roundNumber);
  if (query.skillLevel) filter.skillLevel = query.skillLevel;
  if (query.playerId) {
    filter.$or = [{ player1Id: query.playerId }, { player2Id: query.playerId }];
  }

  const [items, total] = await Promise.all([
    matchRepository.findMany(filter, { skip, limit, populatePlayers: true }),
    matchRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function getMatchById(id) {
  const match = await matchRepository.findById(id, { populatePlayers: true });
  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Match not found');
  }

  return match;
}

function buildScoreAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashScoreAccessToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCurrentTableAccessEntry(tournament, tokenHash) {
  return (tournament?.tableAccess || []).find((entry) => entry.tokenHash === tokenHash) || null;
}

function toObjectIdString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

async function findCurrentMatchForTable(tournamentId, tableNo) {
  const tableMatches = await matchRepository.findMany(
    {
      tournamentId,
      tableNo,
      status: { $in: ['ongoing', 'ready'] },
    },
    {
      sort: { status: -1, scheduledAt: 1, roundNumber: 1, matchNumber: 1 },
      limit: 20,
      populatePlayers: true,
    },
  );

  if (!tableMatches.length) {
    return null;
  }

  const ongoingMatch = tableMatches.find((item) => item.status === 'ongoing');
  return ongoingMatch || tableMatches[0];
}

async function resolvePublicScoreContext(token) {
  const tokenHash = hashScoreAccessToken(token);
  const match = await matchRepository.findByScoreAccessTokenHash(tokenHash, { populatePlayers: true });

  if (match?.scoreAccess?.enabledAt) {
    const tournament = await tournamentRepository.findById(match.tournamentId);
    return {
      mode: 'match',
      match,
      tournament,
      tableNo: match.tableNo || null,
      tokenHash,
    };
  }

  const tournament = await tournamentRepository.findByTableAccessTokenHash(tokenHash);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Public score access not found');
  }

  const tableAccess = getCurrentTableAccessEntry(tournament, tokenHash);
  if (!tableAccess?.enabledAt) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Public score access not found');
  }

  const currentMatch = await findCurrentMatchForTable(tournament._id, tableAccess.tableNo);

  return {
    mode: 'table',
    match: currentMatch,
    tournament,
    tableNo: tableAccess.tableNo,
    tokenHash,
  };
}

function buildPublicScoreResponse(context) {
  return {
    mode: context.mode,
    tableNo: context.tableNo,
    tournamentId: context.tournament?._id || context.match?.tournamentId || null,
    tournamentName: context.tournament?.name || null,
    match: context.match,
  };
}

async function getPublicScoreMatch(token) {
  const context = await resolvePublicScoreContext(token);
  return buildPublicScoreResponse(context);
}

async function scheduleMatch(id, payload, actor) {
  const match = await getMatchById(id);
  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  match.scheduledAt = payload.scheduledAt;
  match.tableNo = payload.tableNo || null;
  match.updatedBy = actor.sub;
  await match.save();
  await assignReadyMatchesToTables(tournament);
  return match;
}

async function updateMatchStatus(id, payload, actor) {
  const match = await getMatchById(id);
  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  match.status = payload.status;
  match.updatedBy = actor.sub;
  if (payload.status === 'ongoing' && !match.startedAt) {
    match.startedAt = new Date();
  }
  await match.save();
  return matchRepository.findById(match._id, { populatePlayers: true });
}

async function updateLiveScore(id, payload, actor) {
  const match = await getMatchById(id);
  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  if (match.status === 'completed' || match.resultLocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Cannot update score for a completed match');
  }
  if (!match.player1Id || !match.player2Id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Match does not have two players');
  }

  if (payload.player1Score === payload.player2Score && payload.player1Score >= match.raceTo) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Completed match score cannot end in a draw');
  }

  match.player1Score = payload.player1Score;
  match.player2Score = payload.player2Score;
  match.status = 'ongoing';
  match.startedAt = match.startedAt || new Date();
  match.updatedBy = actor.sub;
  await match.save();
  return matchRepository.findById(match._id, { populatePlayers: true });
}

async function updatePublicLiveScore(token, payload) {
  const context = await resolvePublicScoreContext(token);
  const match = context.match;

  if (!match) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'No active match is currently assigned to this table');
  }

  if (match.status === 'completed' || match.resultLocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Cannot update score for a completed match');
  }

  if (!match.player1Id || !match.player2Id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Match does not have two players');
  }

  match.player1Score = payload.player1Score;
  match.player2Score = payload.player2Score;
  match.status = 'ongoing';
  match.startedAt = match.startedAt || new Date();

  if (context.mode === 'match') {
    match.scoreAccess.lastUsedAt = new Date();
  }

  if (context.mode === 'table' && context.tournament) {
    const tableEntry = (context.tournament.tableAccess || []).find((entry) => entry.tableNo === context.tableNo);
    if (tableEntry) {
      tableEntry.lastUsedAt = new Date();
      context.tournament.markModified('tableAccess');
      await context.tournament.save();
    }
  }

  await match.save();
  return buildPublicScoreResponse({
    ...context,
    match: await matchRepository.findById(match._id, { populatePlayers: true }),
  });
}

async function updateRegistrationStats(tournamentId, playerId, win, stage) {
  const registration = await registrationRepository.findOne({ tournamentId, playerId });
  if (!registration) return;

  registration.stats.matchesPlayed += 1;
  if (win) {
    registration.stats.matchesWon += 1;
  } else {
    registration.stats.eliminatedRound = stage;
  }
  await registration.save();
}

function normalizePrizeLabel(label = '') {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getPrizeAmountPerWinner(prizeRow) {
  if (!prizeRow) return 0;
  const payoutCount = Number(prizeRow.payoutCount || 1);
  const totalAmount = Number(prizeRow.amount || 0);

  if (payoutCount <= 0) {
    return totalAmount;
  }

  return Math.round(totalAmount / payoutCount);
}

function findPrizeRow(prizeStructure = [], aliases = []) {
  const normalizedAliases = aliases.map((alias) => normalizePrizeLabel(alias));
  return prizeStructure.find((item) => normalizedAliases.includes(normalizePrizeLabel(item.label)));
}

async function awardPlacementBucket({
  playerIds,
  tournament,
  skillLevel,
  sourceType,
  sourceSuffix,
  pointsRule,
  tierMultiplier,
  prizeRow,
  createdBy,
  metricIncrements = {},
  note,
}) {
  const uniquePlayerIds = [...new Set((playerIds || []).map((playerId) => toObjectIdString(playerId)).filter(Boolean))];

  if (!uniquePlayerIds.length) {
    return;
  }

  const pointsDelta = Math.round(pointsRule * tierMultiplier);
  const prizeMoneyDelta = getPrizeAmountPerWinner(prizeRow);

  for (const playerId of uniquePlayerIds) {
    await rankingService.recordPointChange({
      playerId,
      tournamentId: tournament._id,
      sourceType,
      sourceKey: `tournament:${tournament._id}:placement:${skillLevel}:${sourceSuffix}:${playerId}`,
      pointsDelta,
      prizeMoneyDelta,
      note,
      createdBy,
      metricIncrements,
    });
  }
}

async function finalizeTournamentIfNeeded(match, actorId) {
  if (!['final', 'grand_final'].includes(match.stage)) {
    return null;
  }

  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) return null;

  const approvedRegistrations = await registrationRepository.findMany(
    { tournamentId: tournament._id, status: 'approved' },
    { limit: 1024 },
  );
  const tierMultiplier = rankingService.TIER_MULTIPLIER[tournament.tier] || 1;
  const championPrize = findPrizeRow(tournament.prizeStructure, ['champion', 'winner', '1st', '1st_place']);
  const runnerUpPrize = findPrizeRow(tournament.prizeStructure, ['runner_up', 'runner-up', 'finalist', '2nd', '2nd_place']);
  const top4Prize = findPrizeRow(tournament.prizeStructure, ['top_4', 'top4', 'semi_final', 'semi-final', 'semifinal', 'semi finalist']);
  const top8Prize = findPrizeRow(tournament.prizeStructure, ['top_8', 'top8', 'quarter_final', 'quarter-final', 'quarterfinal', 'quarter finalist']);
  const top16Prize = findPrizeRow(tournament.prizeStructure, ['top_16', 'top16', 'last_16', 'last16']);

  for (const registration of approvedRegistrations) {
    await rankingService.recordPointChange({
      playerId: registration.playerId,
      tournamentId: tournament._id,
      sourceType: 'participation',
      sourceKey: `tournament:${tournament._id}:participation`,
      pointsDelta: Math.round(rankingService.POINT_RULES.participation * tierMultiplier),
      note: `Participation points for ${tournament.name}`,
      createdBy: actorId,
      metricIncrements: { tournamentsPlayed: 1 },
    });
  }

  const semifinalLosers = await matchRepository.findMany(
    { tournamentId: tournament._id, skillLevel: match.skillLevel, stage: 'semi_final', status: 'completed' },
    { limit: 4 },
  );
  const quarterFinalLosers = await matchRepository.findMany(
    { tournamentId: tournament._id, skillLevel: match.skillLevel, stage: 'quarter_final', status: 'completed' },
    { limit: 8 },
  );
  const roundOf16Losers = await matchRepository.findMany(
    { tournamentId: tournament._id, skillLevel: match.skillLevel, stage: 'round_of_16', status: 'completed' },
    { limit: 16 },
  );

  await awardPlacementBucket({
    playerIds: semifinalLosers.map((item) => item.loserPlayerId),
    tournament,
    skillLevel: match.skillLevel,
    sourceType: 'top4',
    sourceSuffix: 'top4',
    pointsRule: rankingService.POINT_RULES.top4,
    tierMultiplier,
    prizeRow: top4Prize,
    createdBy: actorId,
    metricIncrements: { top4Count: 1 },
    note: `Top 4 bonus for ${tournament.name}`,
  });

  await awardPlacementBucket({
    playerIds: quarterFinalLosers.map((item) => item.loserPlayerId),
    tournament,
    skillLevel: match.skillLevel,
    sourceType: 'top8',
    sourceSuffix: 'top8',
    pointsRule: rankingService.POINT_RULES.top8,
    tierMultiplier,
    prizeRow: top8Prize,
    createdBy: actorId,
    metricIncrements: { top8Count: 1 },
    note: `Top 8 bonus for ${tournament.name}`,
  });

  await awardPlacementBucket({
    playerIds: roundOf16Losers.map((item) => item.loserPlayerId),
    tournament,
    skillLevel: match.skillLevel,
    sourceType: 'top16',
    sourceSuffix: 'top16',
    pointsRule: rankingService.POINT_RULES.top16,
    tierMultiplier,
    prizeRow: top16Prize,
    createdBy: actorId,
    metricIncrements: { top16Count: 1 },
    note: `Top 16 bonus for ${tournament.name}`,
  });

  await awardPlacementBucket({
    playerIds: [match.loserPlayerId],
    tournament,
    skillLevel: match.skillLevel,
    sourceType: 'runner_up',
    sourceSuffix: 'runner_up',
    pointsRule: rankingService.POINT_RULES.runnerUp,
    tierMultiplier,
    prizeRow: runnerUpPrize,
    createdBy: actorId,
    metricIncrements: { runnerUps: 1 },
    note: `Runner-up bonus for ${tournament.name}`,
  });

  await awardPlacementBucket({
    playerIds: [match.winnerPlayerId],
    tournament,
    skillLevel: match.skillLevel,
    sourceType: 'champion',
    sourceSuffix: 'champion',
    pointsRule: rankingService.POINT_RULES.champion,
    tierMultiplier,
    prizeRow: championPrize,
    createdBy: actorId,
    metricIncrements: { championships: 1 },
    note: `Champion bonus for ${tournament.name}`,
  });

  if (match.skillLevel) {
    tournament.championsBySkillLevel = [
      ...(tournament.championsBySkillLevel || []).filter((item) => item.skillLevel !== match.skillLevel),
      { skillLevel: match.skillLevel, playerId: match.winnerPlayerId },
    ];
  }
  tournament.championPlayerId = match.winnerPlayerId;
  tournament.updatedBy = actorId;

  const remainingMatches = await matchRepository.countDocuments({
    tournamentId: tournament._id,
    status: { $in: ['scheduled', 'ready', 'ongoing'] },
  });

  if (remainingMatches === 0) {
    tournament.status = 'finished';
    tournament.endAt = new Date();
    await registrationRepository.updateMany(
      { tournamentId: tournament._id },
      { $set: { skillLevel: null } },
    );
  }

  await tournament.save();
  await rankingService.rebuildRanks('all_time');
  return tournament;
}

async function completeMatchInternal(match, payload, actorId = null, tournamentOverride = null) {
  const tournament = tournamentOverride || await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  if (match.resultLocked) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Match result is locked');
  }
  if (!match.player1Id || !match.player2Id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Match does not have two players');
  }

  const player1Id = toObjectIdString(match.player1Id);
  const player2Id = toObjectIdString(match.player2Id);
  const winnerPlayerId = payload.winnerPlayerId || (payload.player1Score > payload.player2Score ? player1Id : player2Id);

  if (payload.player1Score === payload.player2Score) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Draw score is not supported for knockout matches');
  }
  if (Math.max(payload.player1Score, payload.player2Score) < match.raceTo) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, `Winner must reach race to ${match.raceTo}`);
  }

  if (![player1Id, player2Id].includes(winnerPlayerId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Winner must be one of the players');
  }

  const loserPlayerId = winnerPlayerId === player1Id ? player2Id : player1Id;

  if (match.status === 'completed') {
    const currentWinnerId = toObjectIdString(match.winnerPlayerId);

    if (currentWinnerId && currentWinnerId !== winnerPlayerId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        errorCodes.BAD_REQUEST,
        'Score correction cannot change the winner after a match is completed',
      );
    }

    match.player1Score = payload.player1Score;
    match.player2Score = payload.player2Score;
    if (actorId) {
      match.updatedBy = actorId;
    }
    await match.save();

    return {
      match: await matchRepository.findById(match._id, { populatePlayers: true }),
      tournamentStatus: tournament?.status || null,
      tournament,
    };
  }

  const tierMultiplier = rankingService.TIER_MULTIPLIER[tournament?.tier] || 1;

  match.player1Score = payload.player1Score;
  match.player2Score = payload.player2Score;
  match.winnerPlayerId = winnerPlayerId;
  match.loserPlayerId = loserPlayerId;
  match.status = 'completed';
  match.startedAt = match.startedAt || new Date();
  match.completedAt = new Date();
  if (actorId) {
    match.updatedBy = actorId;
  }
  await match.save();

  await Promise.all([
    updateRegistrationStats(match.tournamentId, match.player1Id, winnerPlayerId === player1Id, match.stage),
    updateRegistrationStats(match.tournamentId, match.player2Id, winnerPlayerId === player2Id, match.stage),
  ]);

  await rankingService.recordPointChange({
    playerId: winnerPlayerId,
    tournamentId: match.tournamentId,
    matchId: match._id,
    sourceType: 'match_win',
    sourceKey: `match:${match._id}:winner`,
    pointsDelta: Math.round(rankingService.POINT_RULES.matchWin * tierMultiplier),
    note: `Match win points from ${tournament?.name || 'tournament'}`,
    createdBy: actorId,
    metricIncrements: { matchesWon: 1, matchesPlayed: 1 },
  });

  await rankingService.recordPointChange({
    playerId: loserPlayerId,
    tournamentId: match.tournamentId,
    matchId: match._id,
    sourceType: 'manual_adjustment',
    sourceKey: `match:${match._id}:played:${loserPlayerId}`,
    pointsDelta: 0,
    note: `Match played in ${tournament?.name || 'tournament'}`,
    createdBy: actorId,
    metricIncrements: { matchesPlayed: 1 },
  });

  if (match.nextMatchId) {
    const nextMatch = await matchRepository.findById(match.nextMatchId);
    if (nextMatch) {
      nextMatch[`player${match.nextMatchSlot}Id`] = winnerPlayerId;
      if (nextMatch.player1Id && nextMatch.player2Id && ['scheduled', 'ongoing'].includes(nextMatch.status)) {
        nextMatch.status = 'ready';
      }
      await nextMatch.save();
    }
  }

  if (match.loserNextMatchId) {
    const loserNextMatch = await matchRepository.findById(match.loserNextMatchId);
    if (loserNextMatch) {
      loserNextMatch[`player${match.loserNextMatchSlot}Id`] = loserPlayerId;
      if (loserNextMatch.player1Id && loserNextMatch.player2Id && ['scheduled', 'ongoing'].includes(loserNextMatch.status)) {
        loserNextMatch.status = 'ready';
      }
      await loserNextMatch.save();
    }
  }

  await assignReadyMatchesToTables(tournament, { preferredTableNo: match.tableNo || null });

  const finalizedTournament = await finalizeTournamentIfNeeded(match, actorId);

  return {
    match: await matchRepository.findById(match._id, { populatePlayers: true }),
    tournamentStatus: finalizedTournament?.status || tournament?.status || null,
    tournament: finalizedTournament || tournament,
  };
}

async function generateScoreAccess(id, actor) {
  const match = await getMatchById(id);
  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  if (!match.tableNo) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Assign a table before generating table QR access');
  }

  const validTables = buildTournamentTableLabels(tournament);
  if (!validTables.includes(match.tableNo)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Selected match table is not part of tournament table configuration');
  }

  const token = buildScoreAccessToken();
  const tokenHash = hashScoreAccessToken(token);
  const appBaseUrl = String(env.clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const scoreUrl = `${appBaseUrl}/score-entry/${token}`;

  const tableAccessEntries = [...(tournament.tableAccess || []).filter((entry) => entry.tableNo !== match.tableNo)];
  tableAccessEntries.push({
    tableNo: match.tableNo,
    tokenHash,
    enabledAt: new Date(),
    lastUsedAt: null,
  });

  tournament.tableAccess = tableAccessEntries;
  tournament.updatedBy = actor.sub;
  tournament.markModified('tableAccess');
  await tournament.save();

  const qrCodeDataUrl = await QRCode.toDataURL(scoreUrl, {
    margin: 1,
    width: 280,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  return {
    matchId: match._id,
    tableNo: match.tableNo,
    scoreUrl,
    qrCodeDataUrl,
  };
}

async function updateMatchResult(id, payload, actor) {
  const match = await getMatchById(id);
  const tournament = await tournamentRepository.findById(match.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);
  return completeMatchInternal(match, payload, actor.sub, tournament);
}

async function updatePublicMatchResult(token, payload) {
  const context = await resolvePublicScoreContext(token);
  const match = context.match;

  if (!match) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'No active match is currently assigned to this table');
  }

  if (context.mode === 'match') {
    match.scoreAccess.lastUsedAt = new Date();
  }

  if (context.mode === 'table' && context.tournament) {
    const tableEntry = (context.tournament.tableAccess || []).find((entry) => entry.tableNo === context.tableNo);
    if (tableEntry) {
      tableEntry.lastUsedAt = new Date();
      context.tournament.markModified('tableAccess');
      await context.tournament.save();
    }
  }

  await completeMatchInternal(match, payload, null, context.tournament || null);
  const refreshedContext = await resolvePublicScoreContext(token);
  return buildPublicScoreResponse(refreshedContext);
}

module.exports = {
  listByTournament,
  getMatchById,
  getPublicScoreMatch,
  scheduleMatch,
  updateMatchStatus,
  updateLiveScore,
  updatePublicLiveScore,
  updatePublicMatchResult,
  generateScoreAccess,
  updateMatchResult,
};




