const Tournament = require('./tournament.model');

async function create(payload) {
  return Tournament.create(payload);
}

async function findById(id) {
  return Tournament.findOne({ _id: id, deletedAt: null });
}

async function findByIdIncludingDeleted(id) {
  return Tournament.findById(id);
}

async function findByTableAccessTokenHash(tokenHash) {
  return Tournament.findOne({
    deletedAt: null,
    'tableAccess.tokenHash': tokenHash,
  }).select('+tableAccess.tokenHash');
}

async function findMany(filter, options = {}) {
  return Tournament.find({ ...filter, deletedAt: null })
    .sort(options.sort || { startAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

async function findManyIncludingDeleted(filter, options = {}) {
  return Tournament.find(filter)
    .sort(options.sort || { startAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

async function countDocuments(filter) {
  return Tournament.countDocuments({ ...filter, deletedAt: null });
}

async function countDocumentsIncludingDeleted(filter) {
  return Tournament.countDocuments(filter);
}

async function updateById(id, payload, options = {}) {
  return Tournament.findOneAndUpdate(
    { _id: id, deletedAt: null },
    payload,
    { new: true, ...options },
  );
}

async function deletePermanently(id) {
  return Tournament.deleteOne({ _id: id });
}

module.exports = {
  create,
  findById,
  findByIdIncludingDeleted,
  findByTableAccessTokenHash,
  findMany,
  findManyIncludingDeleted,
  countDocuments,
  countDocumentsIncludingDeleted,
  updateById,
  deletePermanently,
};
