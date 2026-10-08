PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin','cashier')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  sku                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name                TEXT    NOT NULL,
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price               REAL    NOT NULL CHECK (price >= 0),
  cost                REAL    NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock_qty           INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  phone      TEXT,
  email      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no     TEXT    NOT NULL UNIQUE,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subtotal       REAL    NOT NULL CHECK (subtotal >= 0),
  discount       REAL    NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax            REAL    NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total          REAL    NOT NULL CHECK (total >= 0),
  amount_paid    REAL    NOT NULL CHECK (amount_paid >= 0),
  change_due     REAL    NOT NULL DEFAULT 0 CHECK (change_due >= 0),
  payment_method TEXT    NOT NULL CHECK (payment_method IN ('cash','card','mobile')),
  status         TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','void')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  voided_at      TEXT,
  voided_by      INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT    NOT NULL,
  unit_price   REAL    NOT NULL CHECK (unit_price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   REAL    NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS invoice_counters (
  day      TEXT    PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active    ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created      ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user         ON sales(user_id);
