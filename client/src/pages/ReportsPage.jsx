import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  TrendingUp, 
  Percent, 
  CreditCard, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

export default function ReportsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Quick range filters: '7d', '30d', 'custom'
  const [rangePreset, setRangePreset] = useState('7d');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getSummary(fromDate, toDate);
      setData(res?.data || null);
    } catch (err) {
      toast.error('Failed to load report summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [fromDate, toDate]);

  const handleSelectPreset = (days) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setRangePreset(`${days}d`);
    setFromDate(start);
    setToDate(end);
  };

  const avgOrderValue = data?.orders > 0 ? (data.revenue / data.orders) : 0;
  const maxDayRevenue = data?.byDay ? Math.max(...data.byDay.map((d) => d.revenue), 1) : 1;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-50 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics & Sales Reports</h2>
          <p className="text-xs text-slate-500">Business performance metrics, sales trends, and inventory health</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex text-xs">
            <button
              onClick={() => handleSelectPreset(7)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                rangePreset === '7d' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleSelectPreset(30)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                rangePreset === '30d' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setRangePreset('custom');
                setFromDate(e.target.value);
              }}
              className="bg-transparent focus:outline-none"
            />
            <span className="text-slate-300">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setRangePreset('custom');
                setToDate(e.target.value);
              }}
              className="bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={loadSummary}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading analytics...
        </div>
      ) : data ? (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                ${Number(data.revenue || 0).toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Completed orders only</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Orders Placed</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {data.orders || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Sales volume count</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Order Value</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                ${avgOrderValue.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Average per customer visit</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tax & Discounts</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900 space-y-0.5">
                <div>Tax: ${Number(data.tax || 0).toFixed(2)}</div>
                <div className="text-emerald-600">Discounts: -${Number(data.discounts || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Daily Revenue Bar Chart Visualization */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Daily Revenue Trend</h3>
                <p className="text-xs text-slate-500">Daily breakdown for selected date range</p>
              </div>
            </div>

            <div className="h-44 flex items-end gap-2 pt-6">
              {data.byDay?.map((d) => {
                const heightPercent = maxDayRevenue > 0 ? (d.revenue / maxDayRevenue) * 100 : 0;
                const formattedDay = d.day.slice(5); // MM-DD
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      ${Math.round(d.revenue)}
                    </div>
                    <div
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                      className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                        d.revenue > 0 ? 'bg-indigo-600 group-hover:bg-indigo-500' : 'bg-slate-100'
                      }`}
                    ></div>
                    <div className="text-[11px] font-mono text-slate-500">{formattedDay}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2-Column: Top Products & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Top 5 Best-Selling Products</h3>
              {data.topProducts?.length === 0 ? (
                <p className="text-xs text-slate-400">No product sales in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800 block">{item.product_name}</span>
                          <span className="text-[11px] text-slate-400">{item.qty} units sold</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">${Number(item.revenue).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Payment Methods</h3>
              {data.paymentBreakdown?.length === 0 ? (
                <p className="text-xs text-slate-400">No payment data recorded.</p>
              ) : (
                <div className="space-y-3">
                  {data.paymentBreakdown?.map((pm, idx) => {
                    const percent = data.revenue > 0 ? ((pm.revenue / data.revenue) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="capitalize text-slate-700 font-semibold">{pm.payment_method} ({pm.orders} orders)</span>
                          <span className="font-bold text-slate-900">${Number(pm.revenue).toFixed(2)} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts Table */}
          {data.lowStock && data.lowStock.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Low Stock Critical Alerts ({data.lowStock.length} items)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.lowStock.map((item) => (
                  <div key={item.id} className="p-3 bg-white rounded-xl border border-amber-200/80 text-xs flex justify-between items-center shadow-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-xs">
                        {item.stock_qty} left
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Threshold: {item.low_stock_threshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
