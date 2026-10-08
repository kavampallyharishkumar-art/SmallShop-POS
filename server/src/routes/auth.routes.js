import { Router } from 'express';
import db from '../db/connection.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, updateUserSchema } from '../validators/auth.schema.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

// If the users table is empty, allow unauthenticated bootstrap (first admin).
// Otherwise require admin auth.
function bootstrapOrAdmin(req, res, next) {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (row.cnt === 0) return next();
  requireAuth(req, res, () => requireRole('admin')(req, res, next));
}

router.post('/register', bootstrapOrAdmin, validate({ body: registerSchema }), ctrl.register);
router.post('/login', validate({ body: loginSchema }), ctrl.login);
router.get('/me', requireAuth, ctrl.getMe);
router.get('/users', requireAuth, requireRole('admin'), ctrl.listUsers);
router.patch('/users/:id', requireAuth, requireRole('admin'), validate({ body: updateUserSchema }), ctrl.updateUser);

export default router;
