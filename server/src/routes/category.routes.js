import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { categorySchema } from '../validators/category.schema.js';
import * as ctrl from '../controllers/category.controller.js';

const router = Router();

router.get('/', requireAuth, ctrl.listCategories);
router.post('/', requireAuth, requireRole('admin'), validate({ body: categorySchema }), ctrl.createCategory);
router.put('/:id', requireAuth, requireRole('admin'), validate({ body: categorySchema }), ctrl.updateCategory);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteCategory);

export default router;
