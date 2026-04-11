const Match = require('./match.model');

async function createMany(payload) {
  return Match.insertMany(payload, { ordered: true });
}

function applyPlayerPopulation(query, enabled) {
  if (!enabled) {
    return query;
  }

  return query.populate('player1Id').populate('player2Id').populate('winnerPlayerId');
}

async function findById(id, options = {}) {
  const query = Match.findById(id);
  return applyPlayerPopulation(query, options.populatePlayers);
}

async function findByScoreAccessTokenHash(tokenHash, options = {}) {
  const query = Match.findOne({ 'scoreAccess.tokenHash': tokenHash });
  return applyPlayerPopulation(query, options.populatePlayers);
}

async function findMany(filter, options = {}) {
  const query = Match.find(filter)
    .sort(options.sort || { roundNumber: 1, matchNumber: 1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);

  return applyPlayerPopulation(query, options.populatePlayers);
}

async function countDocuments(filter) {
  return Match.countDocuments(filter);
}

async function updateById(id, payload) {
  return Match.findByIdAndUpdate(id, payload, { new: true });
}

module.exports = {
  createMany,
  findById,
  findByScoreAccessTokenHash,
  findMany,
  countDocuments,
  updateById,
};
