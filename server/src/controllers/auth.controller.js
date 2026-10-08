import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory rate limiter: { ip: [timestamp, ...] }
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
  if (attempts.length >= RATE_LIMIT_MAX) {
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many login attempts, please try again later');
  }
  attempts.push(now);
  loginAttempts.set(ip, attempts);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function login(req, res, next) {
  try {
    const ip = req.ip;
    checkRateLimit(ip);

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

    if (!user) {
      // Still do a dummy compare to prevent timing attacks
      bcrypt.compare(password, '$2b$10$invalidhashinvalidhashinvalidhas').catch(() => {});
      return next(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    bcrypt.compare(password, user.password_hash).then(valid => {
      if (!valid) return next(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
      if (!user.is_active) return next(new ApiError(403, 'ACCOUNT_DISABLED', 'Account is disabled'));
      const token = signToken(user);
      res.json({ token, user: safeUser(user) });
    }).catch(next);
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if users table is empty for bootstrap
    const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const isBootstrap = userCount === 0;

    const assignedRole = isBootstrap ? 'admin' : (role || 'cashier');
    const hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    try {
      const result = db.prepare(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
      ).run(name, normalizedEmail, hash, assignedRole);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ data: safeUser(user) });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(new ApiError(409, 'EMAIL_TAKEN', 'Email address already in use'));
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res) {
  res.json({ user: req.user });
}

export function listUsers(req, res) {
  const users = db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  res.json({ data: users });
}

export async function updateUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id) {
      return next(new ApiError(400, 'CANNOT_MODIFY_SELF', 'Admin cannot modify their own account'));
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!user) return next(new ApiError(404, 'USER_NOT_FOUND', 'User not found'));

    const { name, role, is_active, password } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
    if (password !== undefined) updates.password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    if (Object.keys(updates).length === 0) {
      const safe = { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active };
      return res.json({ data: safe });
    }

    updates.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), targetId];
    db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(targetId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
