const Player = require('./player.model');

async function create(payload) {
  return Player.create(payload);
}

async function findById(id) {
  return Player.findOne({ _id: id, deletedAt: null });
}

async function findOne(filter) {
  return Player.findOne({ ...filter, deletedAt: null });
}

async function findMany(filter, options = {}) {
  return Player.find({ ...filter, deletedAt: null })
    .sort(options.sort || { 'stats.rankingPoints': -1, displayName: 1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

async function countDocuments(filter) {
  return Player.countDocuments({ ...filter, deletedAt: null });
}

module.exports = {
  create,
  findById,
  findOne,
  findMany,
  countDocuments,
};
