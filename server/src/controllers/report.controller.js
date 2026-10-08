import db from '../db/connection.js';

// Generate an inclusive array of YYYY-MM-DD strings from start to end.
function buildDateSeries(fromStr, toStr) {
  const dates = [];
  const cur = new Date(fromStr + 'T00:00:00Z');
  const end = new Date(toStr + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function getSummary(req, res) {
  const { from, to } = req.query;

  // Default: last 7 days inclusive of today
  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fromStr = from || sevenDaysAgo;
  const toStr = to || todayStr;

  const dates = buildDateSeries(fromStr, toStr);

  // Aggregate totals for the period (completed sales only)
  const summary = db.prepare(
    `SELECT
       COALESCE(SUM(total), 0)    AS revenue,
       COUNT(*)                   AS orders,
       COALESCE(SUM(discount), 0) AS discounts,
       COALESCE(SUM(tax), 0)      AS tax
     FROM sales
     WHERE status = 'completed'
       AND date(created_at) >= ? AND date(created_at) <= ?`
  ).get(fromStr, toStr);

  // Per-day breakdown — filled with zeros for missing days in JS
  const byDayRows = db.prepare(
    `SELECT date(created_at) AS day,
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS orders
     FROM sales
     WHERE status = 'completed'
       AND date(created_at) >= ? AND date(created_at) <= ?
     GROUP BY date(created_at)`
  ).all(fromStr, toStr);

  const byDayMap = Object.fromEntries(byDayRows.map(r => [r.day, r]));
  const byDay = dates.map(d => ({
    day: d,
    revenue: byDayMap[d] ? byDayMap[d].revenue : 0,
    orders: byDayMap[d] ? byDayMap[d].orders : 0,
  }));

  // Top 5 products by revenue
  const topProducts = db.prepare(
    `SELECT si.product_name,
            SUM(si.quantity)   AS qty,
            SUM(si.line_total) AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     WHERE s.status = 'completed'
       AND date(s.created_at) >= ? AND date(s.created_at) <= ?
     GROUP BY si.product_name
     ORDER BY revenue DESC
     LIMIT 5`
  ).all(fromStr, toStr);

  // Payment method breakdown
  const paymentBreakdown = db.prepare(
    `SELECT payment_method,
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS orders
     FROM sales
     WHERE status = 'completed'
       AND date(created_at) >= ? AND date(created_at) <= ?
     GROUP BY payment_method`
  ).all(fromStr, toStr);

  // Current low-stock items (independent of date range)
  const lowStock = db.prepare(
    `SELECT id, name, sku, stock_qty, low_stock_threshold
     FROM products
     WHERE is_active = 1 AND stock_qty <= low_stock_threshold
     ORDER BY stock_qty ASC`
  ).all();

  res.json({
    data: {
      from: fromStr,
      to: toStr,
      revenue: summary.revenue,
      orders: summary.orders,
      discounts: summary.discounts,
      tax: summary.tax,
      byDay,
      topProducts,
      paymentBreakdown,
      lowStock,
    },
  });
}
