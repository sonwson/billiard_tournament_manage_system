const rankingRepository = require('./ranking.repository');
const { parsePagination } = require('../../common/utils/pagination');

const POINT_RULES = {
  participation: 5,
  matchWin: 12,
  top8: 15,
  top4: 30,
  runnerUp: 50,
  champion: 80,
};

const TIER_MULTIPLIER = {
  local: 1,
  monthly: 1.1,
  major: 1.25,
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
    pointsBefore: before,
    pointsAfter: after,
    note,
    createdBy,
  });

  return rankingRepository.upsertRanking(
    { playerId, seasonKey },
    {
      $set: {
        totalPoints: after,
        lastTournamentId: tournamentId,
        lastCalculatedAt: new Date(),
        updatedBy: createdBy,
      },
      $inc: metricIncrements,
      $setOnInsert: {
        playerId,
        seasonKey,
        createdBy,
      },
    },
  );
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
  rebuildRanks,
};
