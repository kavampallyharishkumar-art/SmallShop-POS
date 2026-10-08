import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { customerSchema, customerQuerySchema } from '../validators/customer.schema.js';
import * as ctrl from '../controllers/customer.controller.js';

const router = Router();

router.get('/', requireAuth, validate({ query: customerQuerySchema }), ctrl.listCustomers);
router.get('/:id', requireAuth, ctrl.getCustomerById);
router.post('/', requireAuth, validate({ body: customerSchema }), ctrl.createCustomer);
router.put('/:id', requireAuth, validate({ body: customerSchema }), ctrl.updateCustomer);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteCustomer);

export default router;
