const Registration = require('./registration.model');

async function create(payload) {
  return Registration.create(payload);
}

async function findById(id) {
  return Registration.findOne({ _id: id, deletedAt: null });
}

async function findOne(filter) {
  return Registration.findOne({ ...filter, deletedAt: null });
}

async function findMany(filter, options = {}) {
  const query = Registration.find({ ...filter, deletedAt: null })
    .sort(options.sort || { registeredAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);

  if (options.populatePlayer) {
    query.populate('playerId');
  }

  if (options.populateUser) {
    query.populate('userId');
  }

  return query;
}

async function countDocuments(filter) {
  return Registration.countDocuments({ ...filter, deletedAt: null });
}

async function updateById(id, payload) {
  return Registration.findOneAndUpdate(
    { _id: id, deletedAt: null },
    payload,
    { new: true },
  );
}

async function updateMany(filter, payload) {
  return Registration.updateMany(
    { ...filter, deletedAt: null },
    payload,
  );
}

async function countGroupedByTournament(filter = {}) {
  return Registration.aggregate([
    {
      $match: {
        ...filter,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$tournamentId',
        count: { $sum: 1 },
      },
    },
  ]);
}

async function findDistinctPlayerIds(filter = {}) {
  return Registration.distinct('playerId', {
    ...filter,
    deletedAt: null,
  });
}

module.exports = {
  create,
  findById,
  findOne,
  findMany,
  countDocuments,
  updateById,
  updateMany,
  countGroupedByTournament,
  findDistinctPlayerIds,
};
