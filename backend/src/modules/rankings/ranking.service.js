const rankingRepository = require('./ranking.repository');
const { parsePagination } = require('../../common/utils/pagination');

const POINT_RULES = {
  participation: 3,
  matchWin: 7,
  top16: 8,
  top8: 15,
  top4: 28,
  runnerUp: 42,
  champion: 60,
};

const TIER_MULTIPLIER = {
  local: 1,
  monthly: 1.15,
  major: 1.35,
};

async function listRankings(query) {
  const { page, limit, skip } = parsePagination(query);
  const seasonKey = query.seasonKey || 'all_time';
  const filter = { seasonKey };

  const [items, total] = await Promise.all([
    rankingRepository.findMany(filter, { skip, limit }),
    rankingRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function getRankingDetail(playerId, seasonKey = 'all_time') {
  const [ranking, history] = await Promise.all([
    rankingRepository.findOne({ playerId, seasonKey }),
    rankingRepository.findHistory({ playerId, seasonKey }, { limit: 20 }),
  ]);

  return { ranking, history };
}

async function recordPointChange({
  playerId,
  seasonKey = 'all_time',
  tournamentId = null,
  matchId = null,
  sourceType,
  sourceKey,
  pointsDelta,
  prizeMoneyDelta = 0,
  note = '',
  createdBy = null,
  metricIncrements = {},
}) {
  const existed = await rankingRepository.existsHistory({ playerId, sourceKey });
  if (existed) {
    return null;
  }

  const current = await rankingRepository.findOne({ playerId, seasonKey });
  const before = current?.totalPoints || 0;
  const after = before + pointsDelta;

  await rankingRepository.createHistory({
    playerId,
    seasonKey,
    tournamentId,
    matchId,
    sourceType,
    sourceKey,
    pointsDelta,
    prizeMoneyDelta,
    pointsBefore: before,
    pointsAfter: after,
    note,
    createdBy,
  });

  const update = {
    $set: {
      totalPoints: after,
      lastTournamentId: tournamentId,
      lastCalculatedAt: new Date(),
      updatedBy: createdBy,
    },
    $inc: {
      ...metricIncrements,
      totalPrizeMoney: prizeMoneyDelta,
    },
    $setOnInsert: {
      playerId,
      seasonKey,
      createdBy,
    },
  };

  return rankingRepository.upsertRanking({ playerId, seasonKey }, update);
}

async function resetRankings(seasonKey = 'all_time') {
  const RankingHistory = require('./ranking-history.model');
  
  // Delete all ranking history for the season
  await RankingHistory.deleteMany({ seasonKey });
  
  // Reset all rankings to zero points
  const Ranking = require('./ranking.model');
  await Ranking.updateMany(
    { seasonKey },
    {
      $set: {
        totalPoints: 0,
        totalPrizeMoney: 0,
        currentRank: null,
        tournamentsPlayed: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        championships: 0,
        runnerUps: 0,
        top4Count: 0,
        top8Count: 0,
        top16Count: 0,
      },
    }
  );

  return { message: 'All rankings reset successfully' };
}

async function rollbackPointChange(playerId, sourceKey, seasonKey = 'all_time') {
  const RankingHistory = require('./ranking-history.model');
  
  // Find the history entry
  const historyEntry = await RankingHistory.findOne({ playerId, sourceKey, seasonKey });
  
  if (!historyEntry) {
    return null;
  }

  // Check if already rolled back
  if (historyEntry.sourceType === 'reversal') {
    return { message: 'Already rolled back', alreadyRolledBack: true };
  }

  const ranking = await rankingRepository.findOne({ playerId, seasonKey });
  if (!ranking) {
    return null;
  }

  // Reverse the points
  const before = ranking.totalPoints;
  const after = before - historyEntry.pointsDelta;

  // Update ranking
  await rankingRepository.upsertRanking(
    { playerId, seasonKey },
    {
      $set: {
        totalPoints: after,
        lastCalculatedAt: new Date(),
      },
      $inc: {
        totalPrizeMoney: -historyEntry.prizeMoneyDelta,
      },
    }
  );

  // Mark original entry as reversed
  historyEntry.isReversed = true;
  await historyEntry.save();

  // Create reversal history entry
  await rankingRepository.createHistory({
    playerId,
    seasonKey,
    tournamentId: historyEntry.tournamentId,
    matchId: historyEntry.matchId,
    sourceType: 'reversal',
    sourceKey: `${sourceKey}_reversal`,
    pointsDelta: -historyEntry.pointsDelta,
    prizeMoneyDelta: -historyEntry.prizeMoneyDelta,
    pointsBefore: before,
    pointsAfter: after,
    note: `Rollback of: ${historyEntry.note || historyEntry.sourceType}`,
    createdBy: historyEntry.createdBy,
  });

  return {
    message: 'Point change rolled back successfully',
    reversedPoints: historyEntry.pointsDelta,
    newTotal: after,
  };
}

async function rebuildRanks(seasonKey = 'all_time') {
  const rankings = await rankingRepository.findMany({ seasonKey }, { skip: 0, limit: 5000 });

  await Promise.all(
    rankings.map((ranking, index) => rankingRepository.upsertRanking(
      { _id: ranking._id },
      { $set: { currentRank: index + 1 } },
    )),
  );

  return rankings.length;
}

module.exports = {
  POINT_RULES,
  TIER_MULTIPLIER,
  listRankings,
  getRankingDetail,
  recordPointChange,
  resetRankings,
  rollbackPointChange,
  rebuildRanks,
};
