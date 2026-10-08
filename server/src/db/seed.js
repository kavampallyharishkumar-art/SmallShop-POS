import { config } from 'dotenv';
config();
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || './data/pos.db';
const dbPath = path.resolve(__dirname, '../../', DB_FILE);
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.05');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function nextInvoiceNo(day) {
  const row = db.prepare(
    `INSERT INTO invoice_counters (day, last_seq) VALUES (?, 1)
     ON CONFLICT(day) DO UPDATE SET last_seq = last_seq + 1
     RETURNING last_seq`
  ).get(day);
  return `INV-${day.replace(/-/g, '')}-${String(row.last_seq).padStart(4, '0')}`;
}

function createSale({ userId, customerId, items, discount, paymentMethod, amountPaid, createdAt, status }) {
  const txn = db.transaction(() => {
    const lines = [];
    let subtotal = 0;

    for (const item of items) {
      const product = db.prepare('SELECT id, name, price, stock_qty, is_active FROM products WHERE id = ?').get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      const lineTotal = round2(product.price * item.quantity);
      subtotal = round2(subtotal + lineTotal);
      lines.push({ productId: product.id, productName: product.name, unitPrice: product.price, quantity: item.quantity, lineTotal });
    }

    const disc = Math.min(discount || 0, subtotal);
    const taxable = round2(subtotal - disc);
    const tax = round2(taxable * TAX_RATE);
    const total = round2(taxable + tax);
    const paid = (paymentMethod === 'cash') ? amountPaid : total;
    const changeDue = round2(Math.max(paid - total, 0));

    const day = createdAt.split(' ')[0] || createdAt.split('T')[0];
    const invoiceNo = nextInvoiceNo(day);

    const saleInsert = db.prepare(
      `INSERT INTO sales (invoice_no, user_id, customer_id, subtotal, discount, tax, total, amount_paid, change_due, payment_method, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const saleResult = saleInsert.run(invoiceNo, userId, customerId || null, subtotal, disc, tax, total, paid, changeDue, paymentMethod, status || 'completed', createdAt);
    const saleId = saleResult.lastInsertRowid;

    const itemInsert = db.prepare(
      `INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const stockUpdate = db.prepare(
      `UPDATE products SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ? AND stock_qty >= ?`
    );

    for (const line of lines) {
      itemInsert.run(saleId, line.productId, line.productName, line.unitPrice, line.quantity, line.lineTotal);
      if (status !== 'void') {
        const result = stockUpdate.run(line.quantity, line.productId, line.quantity);
        if (result.changes !== 1) throw new Error(`Insufficient stock for product ${line.productId}`);
      }
    }

    return saleId;
  });
  return txn();
}

async function seed() {
  // Users
  const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const cashierHash = await bcrypt.hash('cashier123', BCRYPT_ROUNDS);

  db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
    .run('Ada Admin', 'admin@shop.test', adminHash, 'admin');
  db.prepare(`INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
    .run('Dana Cashier', 'cashier@shop.test', cashierHash, 'cashier');

  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@shop.test');
  const cashier = db.prepare('SELECT id FROM users WHERE email = ?').get('cashier@shop.test');

  // Categories
  const catNames = ['Beverages', 'Snacks', 'Bakery', 'Dairy', 'Produce', 'Household'];
  for (const name of catNames) {
    db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(name);
  }
  const cats = {};
  for (const name of catNames) {
    cats[name] = db.prepare('SELECT id FROM categories WHERE name = ?').get(name).id;
  }

  // Products
  const products = [
    { sku: 'BEV-001', name: 'Cola 330ml', cat: 'Beverages', price: 1.50, cost: 0.70, stock: 120, threshold: 20 },
    { sku: 'BEV-002', name: 'Orange Juice 1L', cat: 'Beverages', price: 3.20, cost: 1.80, stock: 60, threshold: 10 },
    { sku: 'BEV-003', name: 'Mineral Water 500ml', cat: 'Beverages', price: 0.80, cost: 0.30, stock: 200, threshold: 30 },
    { sku: 'BEV-004', name: 'Green Tea 250ml', cat: 'Beverages', price: 1.80, cost: 0.90, stock: 4, threshold: 10 },
    { sku: 'BEV-005', name: 'Energy Drink 250ml', cat: 'Beverages', price: 2.50, cost: 1.20, stock: 80, threshold: 15 },
    { sku: 'SNK-001', name: 'Potato Chips 100g', cat: 'Snacks', price: 1.20, cost: 0.55, stock: 150, threshold: 20 },
    { sku: 'SNK-002', name: 'Peanuts 200g', cat: 'Snacks', price: 2.00, cost: 0.90, stock: 80, threshold: 15 },
    { sku: 'SNK-003', name: 'Chocolate Bar 50g', cat: 'Snacks', price: 1.50, cost: 0.70, stock: 100, threshold: 20 },
    { sku: 'SNK-004', name: 'Popcorn 150g', cat: 'Snacks', price: 1.80, cost: 0.80, stock: 3, threshold: 10 },
    { sku: 'SNK-005', name: 'Gummy Bears 100g', cat: 'Snacks', price: 1.30, cost: 0.60, stock: 90, threshold: 15 },
    { sku: 'BAK-001', name: 'White Bread Loaf', cat: 'Bakery', price: 2.50, cost: 1.20, stock: 40, threshold: 8 },
    { sku: 'BAK-002', name: 'Croissant', cat: 'Bakery', price: 1.20, cost: 0.55, stock: 30, threshold: 10 },
    { sku: 'BAK-003', name: 'Muffin Blueberry', cat: 'Bakery', price: 1.50, cost: 0.70, stock: 25, threshold: 8 },
    { sku: 'BAK-004', name: 'Baguette', cat: 'Bakery', price: 1.80, cost: 0.85, stock: 20, threshold: 5 },
    { sku: 'DAI-001', name: 'Full Cream Milk 1L', cat: 'Dairy', price: 1.60, cost: 0.85, stock: 70, threshold: 15 },
    { sku: 'DAI-002', name: 'Cheddar Cheese 250g', cat: 'Dairy', price: 4.50, cost: 2.80, stock: 35, threshold: 8 },
    { sku: 'DAI-003', name: 'Plain Yogurt 500g', cat: 'Dairy', price: 2.20, cost: 1.10, stock: 40, threshold: 10 },
    { sku: 'DAI-004', name: 'Butter 250g', cat: 'Dairy', price: 3.00, cost: 1.80, stock: 4, threshold: 8 },
    { sku: 'PRD-001', name: 'Bananas 1kg', cat: 'Produce', price: 1.20, cost: 0.50, stock: 80, threshold: 15 },
    { sku: 'PRD-002', name: 'Tomatoes 500g', cat: 'Produce', price: 1.50, cost: 0.65, stock: 60, threshold: 12 },
    { sku: 'PRD-003', name: 'Apples 1kg', cat: 'Produce', price: 2.00, cost: 0.90, stock: 70, threshold: 15 },
    { sku: 'PRD-004', name: 'Onions 1kg', cat: 'Produce', price: 1.00, cost: 0.40, stock: 90, threshold: 20 },
    { sku: 'PRD-005', name: 'Potatoes 2kg', cat: 'Produce', price: 2.50, cost: 1.10, stock: 50, threshold: 10 },
    { sku: 'HHD-001', name: 'Dish Soap 500ml', cat: 'Household', price: 2.80, cost: 1.40, stock: 45, threshold: 10 },
    { sku: 'HHD-002', name: 'Toilet Roll 4pk', cat: 'Household', price: 3.50, cost: 1.80, stock: 60, threshold: 12 },
    { sku: 'HHD-003', name: 'Laundry Powder 1kg', cat: 'Household', price: 5.20, cost: 2.80, stock: 30, threshold: 8 },
    { sku: 'HHD-004', name: 'Toothpaste 100ml', cat: 'Household', price: 2.00, cost: 1.00, stock: 55, threshold: 10 },
    { sku: 'HHD-005', name: 'Hand Soap 300ml', cat: 'Household', price: 1.80, cost: 0.85, stock: 40, threshold: 10 },
  ];

  for (const p of products) {
    db.prepare(
      `INSERT OR IGNORE INTO products (sku, name, category_id, price, cost, stock_qty, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(p.sku, p.name, cats[p.cat], p.price, p.cost, p.stock, p.threshold);
  }

  // Customers
  const customers = [
    { name: 'Maya Cohen', phone: '+1-555-0101', email: 'maya@example.com' },
    { name: 'James Wright', phone: '+1-555-0102', email: 'james@example.com' },
    { name: 'Sofia Patel', phone: '+1-555-0103', email: 'sofia@example.com' },
    { name: 'Carlos Rivera', phone: '+1-555-0104', email: 'carlos@example.com' },
    { name: 'Aisha Nkomo', phone: '+1-555-0105', email: 'aisha@example.com' },
  ];

  for (const c of customers) {
    db.prepare('INSERT OR IGNORE INTO customers (name, phone, email) VALUES (?, ?, ?)').run(c.name, c.phone, c.email);
  }

  const custIds = db.prepare('SELECT id FROM customers ORDER BY id').all().map(r => r.id);
  const prodRows = db.prepare('SELECT id, stock_qty FROM products ORDER BY id').all();
  const userId = admin.id;
  const cashierId = cashier.id;

  // Check if we already have sales (idempotent)
  const existingSales = db.prepare('SELECT COUNT(*) as cnt FROM sales').get().cnt;
  if (existingSales > 0) {
    console.log('Sales already seeded, skipping sales generation.');
    printSummary();
    return;
  }

  // Generate ~40 completed sales over 14 days + 2 void sales
  const now = new Date();
  const paymentMethods = ['cash', 'cash', 'cash', 'card', 'mobile'];
  
  const allProds = db.prepare('SELECT id, price, stock_qty FROM products WHERE is_active = 1').all();

  let saleCount = 0;
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const salesThisDay = dayOffset === 0 ? 3 : Math.floor(Math.random() * 4) + 1; // 1-4 per day

    for (let s = 0; s < salesThisDay && saleCount < 40; s++) {
      const hour = 8 + Math.floor(Math.random() * 10);
      const min = Math.floor(Math.random() * 60);
      const createdAt = `${dateStr} ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const useCustomer = Math.random() > 0.5;
      const customerId = useCustomer ? custIds[Math.floor(Math.random() * custIds.length)] : null;
      const useDiscount = Math.random() > 0.7;
      const numItems = Math.floor(Math.random() * 4) + 1;
      const usedProductIds = new Set();
      const items = [];
      
      // Check available products with sufficient stock
      const availableProds = db.prepare('SELECT id, price, stock_qty FROM products WHERE is_active = 1 AND stock_qty >= 1').all();
      if (availableProds.length === 0) break;

      for (let i = 0; i < numItems; i++) {
        const candidates = availableProds.filter(p => !usedProductIds.has(p.id) && p.stock_qty >= 1);
        if (candidates.length === 0) break;
        const prod = candidates[Math.floor(Math.random() * candidates.length)];
        const maxQty = Math.min(prod.stock_qty, 5);
        const qty = Math.floor(Math.random() * maxQty) + 1;
        usedProductIds.add(prod.id);
        items.push({ productId: prod.id, quantity: qty });
      }

      if (items.length === 0) continue;

      // Compute subtotal for discount
      let subtotal = 0;
      for (const item of items) {
        const prod = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
        subtotal = round2(subtotal + round2(prod.price * item.quantity));
      }
      const discount = useDiscount ? round2(Math.min(Math.random() * 2, subtotal)) : 0;
      const taxable = round2(subtotal - discount);
      const total = round2(round2(taxable * TAX_RATE) + taxable);
      const amountPaid = method === 'cash' ? round2(total + Math.floor(Math.random() * 5)) : total;

      try {
        createSale({ userId: Math.random() > 0.5 ? userId : cashierId, customerId, items, discount, paymentMethod: method, amountPaid, createdAt, status: 'completed' });
        saleCount++;
      } catch (e) {
        // Skip if stock issue
      }
    }
  }

  // 2 void sales
  const availableForVoid = db.prepare('SELECT id, price, stock_qty FROM products WHERE is_active = 1 AND stock_qty >= 2').all();
  if (availableForVoid.length >= 2) {
    for (let v = 0; v < 2; v++) {
      const dateStr = now.toISOString().split('T')[0];
      const createdAt = `${dateStr} 07:0${v}:00`;
      try {
        const saleId = createSale({
          userId,
          customerId: null,
          items: [{ productId: availableForVoid[v].id, quantity: 1 }],
          discount: 0,
          paymentMethod: 'cash',
          amountPaid: 10,
          createdAt,
          status: 'completed'
        });
        // Now void it
        const voidTxn = db.transaction(() => {
          const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
          const saleItemRows = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
          for (const si of saleItemRows) {
            db.prepare('UPDATE products SET stock_qty = stock_qty + ?, updated_at = datetime(\'now\') WHERE id = ?').run(si.quantity, si.product_id);
          }
          db.prepare(`UPDATE sales SET status = 'void', voided_at = datetime('now'), voided_by = ? WHERE id = ?`).run(userId, saleId);
        });
        voidTxn();
      } catch (e) {
        // skip
      }
    }
  }

  printSummary();
}

function printSummary() {
  const users = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  const categories = db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt;
  const products = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
  const customers = db.prepare('SELECT COUNT(*) as cnt FROM customers').get().cnt;
  const sales = db.prepare('SELECT COUNT(*) as cnt FROM sales').get().cnt;
  const voidSales = db.prepare(`SELECT COUNT(*) as cnt FROM sales WHERE status = 'void'`).get().cnt;
  console.log('\n=== Seed Summary ===' );
  console.log(`Users: ${users}`);
  console.log(`Categories: ${categories}`);
  console.log(`Products: ${products}`);
  console.log(`Customers: ${customers}`);
  console.log(`Sales: ${sales} (${voidSales} void)`);
  console.log('====================\n');
  db.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
