import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Eye, 
  Ban, 
  Calendar, 
  CreditCard, 
  Banknote, 
  CircleDollarSign,
  RotateCcw,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';

export default function SalesPage() {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected sale for receipt modal
  const [activeReceiptSale, setActiveReceiptSale] = useState(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await api.getSales({
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 100,
      });
      setSales(res?.data || []);
    } catch (err) {
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [statusFilter, fromDate, toDate]);

  const handleViewReceipt = async (saleId) => {
    try {
      const res = await api.getSale(saleId);
      setActiveReceiptSale(res.data);
    } catch (err) {
      toast.error('Failed to fetch sale details');
    }
  };

  const handleVoidSale = async (sale) => {
    const reason = window.prompt(`Enter reason for voiding sale #${sale.sale_number} (stock will be restored):`, 'Cashier mistake / refund');
    if (reason === null) return;

    try {
      await api.voidSale(sale.id, reason);
      toast.success(`Sale #${sale.sale_number} voided and stock restored`);
      loadSales();
      if (activeReceiptSale && activeReceiptSale.id === sale.id) {
        setActiveReceiptSale(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to void sale');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sales History & Transactions</h2>
          <p className="text-xs text-slate-500">Audit sales, print receipts, and manage voids/refunds</p>
        </div>

        <button
          onClick={loadSales}
          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition self-end sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </div>

          {(fromDate || toDate || statusFilter) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setStatusFilter('');
              }}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No sales found for this period.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const isVoided = sale.status === 'voided';
                  const dateStr = new Date(sale.created_at).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{sale.sale_number}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{dateStr}</td>
                      <td className="py-3 px-4 text-slate-700">{sale.cashier_name || 'Staff'}</td>
                      <td className="py-3 px-4 text-slate-700">{sale.customer_name || 'Walk-in'}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${Number(sale.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewReceipt(sale.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && !isVoided && (
                            <button
                              onClick={() => handleVoidSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Void Sale"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal
        sale={activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
      />
    </div>
  );
}
