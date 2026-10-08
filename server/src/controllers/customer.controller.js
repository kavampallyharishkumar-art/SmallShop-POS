import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePage, paginateMeta } from '../utils/paginate.js';

const CUSTOMER_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') AS visit_count,
    (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') AS total_spent
  FROM customers c
`;

export function listCustomers(req, res) {
  const { search } = req.query;
  const { page, limit, offset } = parsePage(req.query);
  const conditions = [];
  const bindings = [];

  if (search) {
    conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)');
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM customers c ${where}`).get(...bindings);
  const rows = db.prepare(`${CUSTOMER_SELECT} ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?`).all(...bindings, limit, offset);
  res.json({ data: rows, meta: paginateMeta(countRow.cnt, page, limit) });
}

export function getCustomerById(req, res, next) {
  const customer = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(parseInt(req.params.id, 10));
  if (!customer) return next(new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found'));
  res.json({ data: customer });
}

export function createCustomer(req, res, next) {
  try {
    const { name, phone, email } = req.body;
    const result = db.prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)').run(name, phone ?? null, email ?? null);
    const customer = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export function updateCustomer(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) return next(new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found'));
    const { name, phone, email } = req.body;
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (phone !== undefined) fields.phone = phone ?? null;
    if (email !== undefined) fields.email = email ?? null;
    if (Object.keys(fields).length > 0) {
      const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE customers SET ${sets} WHERE id = ?`).run(...Object.values(fields), id);
    }
    const customer = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(id);
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export function deleteCustomer(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
    if (!existing) return next(new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found'));
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
