import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Map SQLite constraint errors to clean responses
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with that value already exists';
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  } else if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
    statusCode = 400;
    code = 'CONSTRAINT_VIOLATION';
    message = 'A database constraint was violated';
  }

  if (env.NODE_ENV === 'development') {
    console.error(err);
  } else {
    console.error({ method: req.method, url: req.url, status: statusCode, message });
  }

  res.status(statusCode).json({
    error: {
      message: env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal server error' : message,
      code,
      details,
    },
  });
}
