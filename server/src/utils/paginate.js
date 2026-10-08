export function parsePage(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginateMeta(total, page, limit) {
  return { page, limit, total, pages: Math.ceil(total / limit) || 1 };
}
