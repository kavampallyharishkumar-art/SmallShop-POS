import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePage, paginateMeta } from '../utils/paginate.js';

function getProduct(id) {
  return db.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`
  ).get(id);
}

export function listProducts(req, res) {
  const { search, category_id, low_stock, include_inactive } = req.query;
  const { page, limit, offset } = parsePage(req.query);

  const conditions = [];
  const bindings = [];

  if (include_inactive !== 'true') {
    conditions.push('p.is_active = 1');
  }
  if (search) {
    conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
    bindings.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    conditions.push('p.category_id = ?');
    bindings.push(category_id);
  }
  if (low_stock === 'true') {
    conditions.push('p.stock_qty <= p.low_stock_threshold');
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM products p ${where}`).get(...bindings);
  const rows = db.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.name ASC
     LIMIT ? OFFSET ?`
  ).all(...bindings, limit, offset);

  res.json({ data: rows, meta: paginateMeta(countRow.cnt, page, limit) });
}

export function getProductById(req, res, next) {
  const product = getProduct(parseInt(req.params.id, 10));
  if (!product) return next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
  res.json({ data: product });
}

export function createProduct(req, res, next) {
  try {
    const { sku, name, category_id, price, cost, stock_qty, low_stock_threshold } = req.body;
    const normalizedSku = sku.toUpperCase().trim();
    try {
      const result = db.prepare(
        `INSERT INTO products (sku, name, category_id, price, cost, stock_qty, low_stock_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(normalizedSku, name, category_id ?? null, price, cost ?? 0, stock_qty ?? 0, low_stock_threshold ?? 5);
      const product = getProduct(result.lastInsertRowid);
      res.status(201).json({ data: product });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(new ApiError(409, 'SKU_TAKEN', 'A product with that SKU already exists'));
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export function updateProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!product) return next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));

    const { sku, name, category_id, price, cost, stock_qty, low_stock_threshold } = req.body;
    const normalizedSku = sku ? sku.toUpperCase().trim() : undefined;
    const fields = {};
    if (normalizedSku !== undefined) fields.sku = normalizedSku;
    if (name !== undefined) fields.name = name;
    if (category_id !== undefined) fields.category_id = category_id ?? null;
    if (price !== undefined) fields.price = price;
    if (cost !== undefined) fields.cost = cost;
    if (stock_qty !== undefined) fields.stock_qty = stock_qty;
    if (low_stock_threshold !== undefined) fields.low_stock_threshold = low_stock_threshold;
    fields.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    try {
      db.prepare(`UPDATE products SET ${sets} WHERE id = ?`).run(...Object.values(fields), id);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(new ApiError(409, 'SKU_TAKEN', 'A product with that SKU already exists'));
      }
      throw err;
    }
    res.json({ data: getProduct(id) });
  } catch (err) {
    next(err);
  }
}

export function adjustStock(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));

    const { delta } = req.body;
    const newQty = product.stock_qty + delta;
    if (newQty < 0) {
      return next(new ApiError(400, 'INSUFFICIENT_STOCK', 'Stock adjustment would result in negative quantity'));
    }
    db.prepare(`UPDATE products SET stock_qty = ?, updated_at = datetime('now') WHERE id = ?`).run(newQty, id);
    res.json({ data: getProduct(id) });
  } catch (err) {
    next(err);
  }
}

export function deleteProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!product) return next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
    db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
