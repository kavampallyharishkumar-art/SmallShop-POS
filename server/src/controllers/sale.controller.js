import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';
import { round2, computeTotals } from '../utils/money.js';
import { nextInvoiceNo } from '../utils/invoice.js';
import { parsePage, paginateMeta } from '../utils/paginate.js';

function formatSaleResponse(sale) {
  const items = db.prepare(
    'SELECT id, product_id, product_name, unit_price, quantity, line_total FROM sale_items WHERE sale_id = ? ORDER BY id'
  ).all(sale.id);
  return { ...sale, items };
}

function getSaleWithNames(id) {
  return db.prepare(
    `SELECT s.*,
            u.name AS cashier_name,
            c.name AS customer_name
     FROM sales s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ?`
  ).get(id);
}

export function createSale(req, res, next) {
  try {
    const { items, customer_id, discount = 0, payment_method, amount_paid = 0 } = req.body;

    // Deduplicate items by merging same product_id quantities
    const mergedItems = new Map();
    for (const item of items) {
      if (mergedItems.has(item.product_id)) {
        mergedItems.get(item.product_id).quantity += item.quantity;
      } else {
        mergedItems.set(item.product_id, { ...item });
      }
    }
    const dedupedItems = [...mergedItems.values()];
    
    let saleId = null;

    const createTxn = db.transaction(() => {
        const lines = [];

        // a. Load each product, check active; collect all stock errors before failing (all-or-nothing)
        const stockErrors = [];
        for (const item of dedupedItems) {
            const product = db.prepare('SELECT id, name, price, stock_qty, is_active FROM products WHERE id = ?').get(item.product_id);
            if (!product) throw new ApiError(400, 'PRODUCT_NOT_FOUND', `Product ${item.product_id} not found`);
            if (!product.is_active) throw new ApiError(409, 'PRODUCT_INACTIVE', `Product "${product.name}" is inactive`);
            if (item.quantity > product.stock_qty) {
                stockErrors.push({ product_id: product.id, name: product.name, requested: item.quantity, available: product.stock_qty });
            }
            const lineTotal = round2(product.price * item.quantity);
            lines.push({
                product_id: product.id,
                product_name: product.name,
                unit_price: product.price,
                quantity: item.quantity,
                line_total: lineTotal,
            });
        }
        // b. Roll back if any item is under-stocked
        if (stockErrors.length > 0) {
            throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Insufficient stock for one or more products', stockErrors);
        }

        // c. Verify customer exists if provided
        if (customer_id) {
            const cust = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
            if (!cust) throw new ApiError(400, 'CUSTOMER_NOT_FOUND', 'Customer not found');
        }

        // d. Server-side totals — any price the client may have sent is ignored entirely
        const totals = computeTotals({ lines, discount });

        // e. Payment rule: cash must cover total; card/mobile defaults to exact total
        let paid = amount_paid;
        if (payment_method === 'cash') {
            if (paid < totals.total) throw new ApiError(400, 'INSUFFICIENT_PAYMENT', 'Amount paid must be at least the total for cash payments');
        } else {
            // card / mobile: amount_paid is always equal to total (no overpay/underpay concept)
            paid = totals.total;
        }
        const change_due = round2(Math.max(paid - totals.total, 0));

        // f. Atomic per-day invoice counter via upsert RETURNING
        const now = new Date();
        const day = now.toISOString().split('T')[0];
        const invoice_no = nextInvoiceNo(db, day);

        // g. Insert sale header
        const saleResult = db.prepare(
            `INSERT INTO sales (invoice_no, user_id, customer_id, subtotal, discount, tax, total, amount_paid, change_due, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(invoice_no, req.user.id, customer_id ?? null, totals.subtotal, totals.discount, totals.tax, totals.total, paid, change_due, payment_method);

        saleId = saleResult.lastInsertRowid;

        const insertItem = db.prepare(
            `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total)
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        // i. Concurrent-safe stock deduction: only updates when stock is still sufficient.
        //    If a parallel request consumed stock between our pre-check and this UPDATE,
        //    changes will be 0 and we throw — rolling back the whole transaction atomically.
        const updateStock = db.prepare(
            `UPDATE products SET stock_qty = stock_qty - ?, updated_at = datetime('now')
             WHERE id = ? AND stock_qty >= ?`
        );

        for (const line of lines) {
            // h. Insert line item with name + price snapshots from DB (never from client)
            insertItem.run(saleId, line.product_id, line.product_name, line.unit_price, line.quantity, line.line_total);
            const result = updateStock.run(line.quantity, line.product_id, line.quantity);
            if (result.changes !== 1) {
                throw new ApiError(409, 'INSUFFICIENT_STOCK', `Concurrent stock conflict on "${line.product_name}"`);
            }
        }
    });

    createTxn();
    const sale = getSaleWithNames(saleId);
    res.status(201).json({ data: formatSaleResponse(sale) });

  } catch (error) {
    next(error);
  }
}

export function listSales(req, res, next) {
    try {
        const { from, to, status, user_id, customer_id } = req.query;
        const { page, limit, offset } = parsePage(req.query);

        const conditions = [];
        const bindings = [];

        if (from) {
            conditions.push("date(s.created_at) >= ?");
            bindings.push(from);
        }
        if (to) {
            conditions.push("date(s.created_at) <= ?");
            bindings.push(to);
        }
        if (status) {
            conditions.push("s.status = ?");
            bindings.push(status);
        }
        if (user_id) {
            conditions.push("s.user_id = ?");
            bindings.push(user_id);
        }
        if (customer_id) {
            conditions.push("s.customer_id = ?");
            bindings.push(customer_id);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM sales s ${where}`).get(...bindings);

        const rows = db.prepare(`
            SELECT s.*, u.name AS cashier_name, c.name AS customer_name
            FROM sales s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN customers c ON c.id = s.customer_id
            ${where}
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...bindings, limit, offset);

        // List view returns the row directly (no items array — only detail view needs that)
        res.json({ data: rows, meta: paginateMeta(countRow.cnt, page, limit) });
    } catch (err) {
        next(err);
    }
}

export function getSaleById(req, res, next) {
    try {
        const sale = getSaleWithNames(parseInt(req.params.id, 10));
        if (!sale) return next(new ApiError(404, 'SALE_NOT_FOUND', 'Sale not found'));
        res.json({ data: formatSaleResponse(sale) });
    } catch (err) {
        next(err);
    }
}

export function voidSale(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        
        let voidedSale = null;
        
        const voidTxn = db.transaction(() => {
            const sale = getSaleWithNames(id);
            if (!sale) throw new ApiError(404, 'SALE_NOT_FOUND', 'Sale not found');
            if (sale.status !== 'completed') throw new ApiError(409, 'SALE_ALREADY_VOID', 'Sale is already voided');

            db.prepare(`UPDATE sales SET status = 'void', voided_at = datetime('now'), voided_by = ? WHERE id = ?`).run(req.user.id, id);

            const items = db.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?').all(id);
            const updateStock = db.prepare(`UPDATE products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ?`);
            
            for (const item of items) {
                updateStock.run(item.quantity, item.product_id);
            }
        });
        
        voidTxn();
        voidedSale = getSaleWithNames(id);
        res.json({ data: formatSaleResponse(voidedSale) });
    } catch (err) {
        next(err);
    }
}
