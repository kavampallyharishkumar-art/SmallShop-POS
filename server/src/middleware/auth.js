import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'TOKEN_EXPIRED', 'Token has expired'));
    }
    return next(new ApiError(401, 'TOKEN_INVALID', 'Invalid token'));
  }

  const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(payload.sub);
  if (!user || !user.is_active) {
    return next(new ApiError(401, 'UNAUTHENTICATED', 'User not found or disabled'));
  }
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}
