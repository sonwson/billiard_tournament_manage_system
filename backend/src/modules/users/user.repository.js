const User = require('./user.model');

async function create(payload) {
  return User.create(payload);
}

async function findById(id, options = {}) {
  const query = User.findOne({ _id: id, deletedAt: null });

  if (options.selectPassword) {
    query.select('+passwordHash +passwordReset.codeHash');
  }

  return query;
}

async function findOne(filter, options = {}) {
  const query = User.findOne({ ...filter, deletedAt: null });

  if (options.selectPassword) {
    query.select('+passwordHash');
  }

  return query;
}

async function findMany(filter, options = {}) {
  return User.find({ ...filter, deletedAt: null })
    .sort(options.sort || { createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 10);
}

async function countDocuments(filter) {
  return User.countDocuments({ ...filter, deletedAt: null });
}

async function updateById(id, payload, options = {}) {
  return User.findOneAndUpdate(
    { _id: id, deletedAt: null },
    payload,
    { new: true, ...options },
  );
}

module.exports = {
  create,
  findById,
  findOne,
  findMany,
  countDocuments,
  updateById,
};
