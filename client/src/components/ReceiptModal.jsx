import React from 'react';
import { Printer, X, CheckCircle2, RotateCcw } from 'lucide-react';

export default function ReceiptModal({ sale, onClose }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header toolbar (screen only) */}
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Receipt</h3>
              <p className="text-xs text-slate-500">{sale.sale_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-sm leading-relaxed" id="printable-receipt">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">SMALL SHOP POS</h2>
            <p className="text-xs text-slate-500">Retail & Convenience</p>
            <p className="text-xs text-slate-400 mt-1">Tel: +1 (555) 019-2834</p>
            <div className="my-3 border-b border-dashed border-slate-300"></div>
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Invoice: #{sale.sale_number}</span>
              <span>{formatDate(sale.created_at)}</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between mt-1">
              <span>Cashier: {sale.cashier_name || 'Staff'}</span>
              <span>Customer: {sale.customer_name || 'Walk-in'}</span>
            </div>
            {sale.status === 'voided' && (
              <div className="mt-2 py-1 bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider rounded">
                ** VOIDED TRANSACTION **
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-slate-300 pb-2 mb-3">
            <div className="grid grid-cols-12 text-xs font-semibold text-slate-500 mb-1">
              <span className="col-span-6">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-4 text-right">PRICE</span>
            </div>
            <div className="space-y-2">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-xs text-slate-800">
                  <div className="col-span-6 truncate font-medium">
                    {item.product_name}
                    <div className="text-[10px] text-slate-400">@ ${Number(item.unit_price).toFixed(2)}</div>
                  </div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-4 text-right font-medium">
                    ${Number(item.line_total || item.unit_price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-${Number(sale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax (5%):</span>
              <span>${Number(sale.tax).toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base text-slate-900">
              <span>TOTAL:</span>
              <span>${Number(sale.total).toFixed(2)}</span>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between text-xs">
              <span className="uppercase">Paid via {sale.payment_method}:</span>
              <span>${Number(sale.amount_paid).toFixed(2)}</span>
            </div>
            {Number(sale.change_due) > 0 && (
              <div className="flex justify-between font-semibold text-xs text-slate-900">
                <span>Change Due:</span>
                <span>${Number(sale.change_due).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-xs text-slate-400 border-t border-dashed border-slate-300 pt-4">
            <p>Thank you for shopping with us!</p>
            <p className="text-[10px] text-slate-400 mt-1">Please keep this receipt for returns/exchanges within 14 days.</p>
          </div>
        </div>

        {/* Footer (screen only) */}
        <div className="p-4 bg-slate-50 border-t flex justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
