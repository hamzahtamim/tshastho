"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingBag, Loader2, AlertCircle, Calendar, DollarSign } from "lucide-react";

export default function DashboardCharts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pharmacy/charts?days=${days}`, { credentials: "include" });
        const d = await res.json();
        if (isMounted && d && !d.error) setData(d);
      } catch (e) {
        console.error("Chart load error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [days]);

  const formatDay = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const formatTaka = (n: number) => {
    if (!n && n !== 0) return "৳0";
    if (n >= 100000) return "৳" + (n / 100000).toFixed(1) + "L";
    if (n >= 1000) return "৳" + (n / 1000).toFixed(1) + "k";
    return "৳" + n.toFixed(0);
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-4">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
        <span className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">Sales Analytics</span>
        <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-200">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                days === d ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg shadow-slate-900/10">
          <div className="flex items-center gap-1.5 mb-2 opacity-70">
            <DollarSign size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
          </div>
          <p className="text-lg font-black">{formatTaka(data.summary?.todaySales || 0)}</p>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2 text-indigo-500">
            <Calendar size={14} /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Week</span>
          </div>
          <p className="text-lg font-black text-slate-800">{formatTaka(data.summary?.weekSales || 0)}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2 text-emerald-500">
            <TrendingUp size={14} /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Month</span>
          </div>
          <p className="text-lg font-black text-slate-800">{formatTaka(data.summary?.monthSales || 0)}</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2 text-amber-500">
            <ShoppingBag size={14} /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orders</span>
          </div>
          <p className="text-lg font-black text-slate-800">{data.summary?.totalOrders || 0}</p>
        </div>
      </div>

      {/* Area Chart: Daily Sales */}
      <div className="pt-4">
        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <AreaChart data={data.dailySales || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => "৳" + (v / 1000).toFixed(0) + "k"} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(v) => ["৳" + Number(v).toFixed(0), "Sales"]} 
                labelFormatter={(l) => new Date(l as string).toDateString()}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart: Top Medicines */}
      <div className="pt-6 border-t border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Top Selling Medicines</h3>
        {(data.topMedicines === undefined || data.topMedicines.length === 0) ? (
          <div className="h-[200px] flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShoppingBag size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-400">No sales data available yet</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.topMedicines} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, "Qty Sold"]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="qty" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
