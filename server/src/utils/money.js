import env from '../config/env.js';

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals({ lines, discount = 0 }) {
  const subtotal = lines.reduce((acc, l) => round2(acc + (l.line_total ?? l.lineTotal ?? 0)), 0);
  const disc = round2(Math.min(discount, subtotal));
  const taxable = round2(subtotal - disc);
  const tax = round2(taxable * env.TAX_RATE);
  const total = round2(taxable + tax);
  return { subtotal, discount: disc, tax, total };
}
