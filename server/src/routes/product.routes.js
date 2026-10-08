import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  stockAdjustSchema,
  productQuerySchema,
} from '../validators/product.schema.js';
import * as ctrl from '../controllers/product.controller.js';

const router = Router();

router.get('/', requireAuth, validate({ query: productQuerySchema }), ctrl.listProducts);
router.get('/:id', requireAuth, ctrl.getProductById);
router.post('/', requireAuth, requireRole('admin'), validate({ body: createProductSchema }), ctrl.createProduct);
router.put('/:id', requireAuth, requireRole('admin'), validate({ body: updateProductSchema }), ctrl.updateProduct);
router.patch('/:id/stock', requireAuth, requireRole('admin'), validate({ body: stockAdjustSchema }), ctrl.adjustStock);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteProduct);

export default router;
