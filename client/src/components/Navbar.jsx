import React, { useState, useEffect } from 'react';
import { Store, LogOut, UserCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 no-print">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Small Shop POS</h1>
          <p className="text-xs text-slate-500 font-medium">Quick Checkout & Inventory</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 py-1 px-3 rounded-full">
              <UserCircle2 className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">{user.name}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  user.role === 'admin' ? 'text-indigo-600' : 'text-emerald-600'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
