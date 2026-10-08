import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category_id: z.number().int().positive().optional().nullable(),
  price: z.number().min(0, 'Price must be a non-negative number'),
  cost: z.number().min(0).optional().default(0),
  stock_qty: z.number().int().min(0).optional().default(0),
  low_stock_threshold: z.number().int().min(0).optional().default(5),
}).strict();

export const updateProductSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  category_id: z.number().int().positive().optional().nullable(),
  price: z.number().min(0, 'Price must be a non-negative number').optional(),
  cost: z.number().min(0).optional(),
  stock_qty: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
}).strict();

export const stockAdjustSchema = z.object({
  delta: z.number().int(),
  reason: z.string().optional(),
}).strict();

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  low_stock: z.enum(['true', 'false']).optional(),
  include_inactive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
