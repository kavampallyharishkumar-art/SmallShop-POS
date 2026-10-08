import db from '../db/connection.js';
import { ApiError } from '../utils/ApiError.js';

export function listCategories(req, res) {
  const rows = db.prepare(
    `SELECT c.id, c.name, c.created_at,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
     FROM categories c ORDER BY c.name ASC`
  ).all();
  res.json({ data: rows });
}

export function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    try {
      const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      const cat = db.prepare('SELECT id, name, created_at, 0 AS product_count FROM categories WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ data: cat });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(new ApiError(409, 'CATEGORY_EXISTS', 'A category with that name already exists'));
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) return next(new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found'));
    try {
      db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return next(new ApiError(409, 'CATEGORY_EXISTS', 'A category with that name already exists'));
      }
      throw err;
    }
    const cat = db.prepare(
      `SELECT c.id, c.name, c.created_at,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
       FROM categories c WHERE c.id = ?`
    ).get(id);
    res.json({ data: cat });
  } catch (err) {
    next(err);
  }
}

export function deleteCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) return next(new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found'));
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
