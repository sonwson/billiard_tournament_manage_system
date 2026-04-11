function parsePagination(query, options = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const defaultLimit = Math.max(Number(options.defaultLimit) || 10, 1);
  const maxLimit = Math.max(Number(options.maxLimit) || 100, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

module.exports = { parsePagination };
