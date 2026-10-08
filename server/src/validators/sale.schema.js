import { z } from 'zod';

export const createSaleSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  customer_id: z.number().int().positive().optional().nullable(),
  discount: z.number().min(0).optional().default(0),
  payment_method: z.enum(['cash', 'card', 'mobile']),
  amount_paid: z.number().min(0).optional().default(0),
}).strict();

export const saleQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['completed', 'void']).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
