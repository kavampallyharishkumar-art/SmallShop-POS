// Kept for uniformity even though we use the synchronous better-sqlite3 driver.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
