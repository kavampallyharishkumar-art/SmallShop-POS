import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSaleSchema, saleQuerySchema } from '../validators/sale.schema.js';
import * as ctrl from '../controllers/sale.controller.js';

const router = Router();

router.get('/', requireAuth, validate({ query: saleQuerySchema }), ctrl.listSales);
router.get('/:id', requireAuth, ctrl.getSaleById);
router.post('/', requireAuth, validate({ body: createSaleSchema }), ctrl.createSale);
router.post('/:id/void', requireAuth, requireRole('admin'), ctrl.voidSale);

export default router;
