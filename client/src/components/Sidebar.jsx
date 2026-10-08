import React from 'react';
import { 
  ShoppingBag, 
  Package, 
  Tags, 
  Users, 
  Receipt, 
  BarChart3, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { isAdmin } = useAuth();

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: ShoppingBag },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sales', label: 'Sales History', icon: Receipt },
    ...(isAdmin ? [
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'users', label: 'Staff & Roles', icon: ShieldCheck },
    ] : []),
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 no-print">
      <div className="p-4 flex-1 space-y-1.5">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Small Shop POS v1.0</p>
          <p className="text-[11px] text-slate-400 mt-0.5">SQLite + Express API</p>
        </div>
      </div>
    </aside>
  );
}
