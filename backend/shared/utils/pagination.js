const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toLimitOffset({ page = 1, pageSize = DEFAULT_LIMIT } = {}) {
  const limit = Math.min(Math.max(Number(pageSize) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  return { limit, offset };
}

module.exports = { toLimitOffset, DEFAULT_LIMIT, MAX_LIMIT };
