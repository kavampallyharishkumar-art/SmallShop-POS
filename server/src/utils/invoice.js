// Generates INV-YYYYMMDD-NNNN using an atomic upsert on invoice_counters.
export function nextInvoiceNo(db, day) {
  const row = db.prepare(
    `INSERT INTO invoice_counters (day, last_seq) VALUES (?, 1)
     ON CONFLICT(day) DO UPDATE SET last_seq = last_seq + 1
     RETURNING last_seq`
  ).get(day);
  return `INV-${day.replace(/-/g, '')}-${String(row.last_seq).padStart(4, '0')}`;
}
