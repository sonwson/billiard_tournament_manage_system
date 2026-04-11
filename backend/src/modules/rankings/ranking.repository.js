const Ranking = require('./ranking.model');
const RankingHistory = require('./ranking-history.model');

async function findMany(filter, options = {}) {
  return Ranking.find(filter)
    .populate('playerId')
    .sort(options.sort || { totalPoints: -1, championships: -1, matchesWon: -1, totalPrizeMoney: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

async function countDocuments(filter) {
  return Ranking.countDocuments(filter);
}

async function findOne(filter) {
  return Ranking.findOne(filter).populate('playerId');
}

async function upsertRanking(filter, update) {
  return Ranking.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
}

async function createHistory(payload) {
  return RankingHistory.create(payload);
}

async function findHistory(filter, options = {}) {
  return RankingHistory.find(filter)
    .sort(options.sort || { effectiveAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
}

async function existsHistory(filter) {
  return RankingHistory.exists(filter);
}

module.exports = {
  findMany,
  countDocuments,
  findOne,
  upsertRanking,
  createHistory,
  findHistory,
  existsHistory,
};
