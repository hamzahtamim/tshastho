"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Pill, Package, ShoppingCart, LogOut, Bell, TrendingUp, 
  Clock, AlertTriangle, Users, ClipboardList, ChevronRight, 
  ArrowUpRight, Activity, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import DashboardCharts from "@/components/pharmacy/DashboardCharts";
import PharmacyNav from "@/components/pharmacy/PharmacyNav";

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    today: { revenue: 0, cost: 0, platformFee: 0, netProfit: 0, orderCount: 0 },
    totalDue: 0, pendingOrders: 0, medicineCount: 0, stockValue: 0, stockCost: 0,
    expired: 0, expiringSoon: 0, customerCount: 0, total: { orderCount: 0 }
  });
  
  const [greeting, setGreeting] = useState("Hello");
  const [profileView, setProfileView] = useState("today");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else if (hour < 21) setGreeting("Good Evening");
    else setGreeting("Good Night");

    const loadData = async () => {
      try {
        const profileRes = await fetch("/api/pharmacy/profile", { credentials: "include" });
        const profileData = await profileRes.json();
        if (profileData.pharmacy) setPharmacy(profileData.pharmacy);

        const statsRes = await fetch("/api/pharmacy/stats", { credentials: "include" });
        const statsData = await statsRes.json();
        if (statsData.today) setStats(statsData);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
      </div>
    </div>
  );
  
  if (!pharmacy) return <div className="p-6 text-center text-red-500 font-bold">Pharmacy profile not found.</div>;

  
  const currentProfit = stats[profileView] || stats.today;

  const profitTabs = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "total", label: "All Time" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
      <PharmacyNav pendingOrders={stats.pendingOrders} />
      
      

      <div className="max-w-5xl mx-auto p-4 space-y-5">
        
        {/* Next-Gen Hero Banner */}
        <div className="relative overflow-hidden bg-[#0B1120] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-indigo-900/20 text-white">
          {/* Abstract Glowing Backgrounds */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/40 to-purple-500/40 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-emerald-500/30 to-teal-500/30 rounded-full blur-[60px] -ml-10 -mb-10"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-slate-300 text-[10px] font-semibold tracking-widest uppercase">{greeting}</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
                {pharmacy.shopName}
              </h1>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1"><Activity size={12}/> {pharmacy.area}, {pharmacy.city}</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <Pill size={32} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </div>
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="space-y-3">
          {stats.pendingOrders > 0 && (
            <Link href="/pharmacy/orders" className="flex items-center justify-between bg-white border border-amber-200/60 rounded-2xl p-4 hover:shadow-lg hover:shadow-amber-500/10 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                  <Bell size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">You have {stats.pendingOrders} new order(s)!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tap to view and process immediately</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {stats.expired > 0 && (
            <Link href="/pharmacy/inventory" className="flex items-center justify-between bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 hover:shadow-lg hover:shadow-rose-500/10 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center border border-rose-200">
                  <AlertTriangle size={18} className="text-rose-600" />
                </div>
                <div>
                  <p className="font-bold text-rose-900 text-sm">⚠️ {stats.expired} Medicine(s) EXPIRED!</p>
                  <p className="text-[11px] text-rose-700/80 mt-0.5">Remove from stock immediately</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {/* High-End Financial Overview */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <div className="p-2 bg-emerald-50 rounded-xl"><TrendingUp size={18} className="text-emerald-600" /></div>
              Financial Overview
            </h2>
            
            {/* Segmented Control Tabs */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-xl overflow-x-auto hide-scrollbar">
              {profitTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setProfileView(tab.key)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                    profileView === tab.key 
                      ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/50" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Glassmorphism Profit Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-5 shadow-lg shadow-emerald-500/20 text-white group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
              <div className="relative z-10">
                <p className="text-emerald-50 text-xs font-semibold mb-1 uppercase tracking-wider">Net Profit</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black">৳{(currentProfit.netProfit || 0).toFixed(2)}</h3>
                  <span className="flex items-center text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white mb-1">
                    <ArrowUpRight size={10} className="mr-0.5"/> Live
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 flex flex-col justify-center hover:bg-slate-50 transition-colors">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-800">৳{(currentProfit.revenue || 0).toFixed(2)}</h3>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 flex flex-col justify-center hover:bg-slate-50 transition-colors">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Orders</p>
              <h3 className="text-2xl font-bold text-slate-800">{currentProfit.orderCount || 0}</h3>
            </div>
          </div>
        </div>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0 border border-blue-200/50">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Medicines</p>
              <p className="font-black text-slate-800 text-xl">{stats.medicineCount}</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0 border border-orange-200/50">
              <ShoppingCart size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Orders</p>
              <p className="font-black text-slate-800 text-xl">{stats.total?.orderCount || 0}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shrink-0 border border-purple-200/50">
              <Users size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customers</p>
              <p className="font-black text-slate-800 text-xl">{stats.customerCount || 0}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shrink-0 border border-amber-200/50">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending</p>
              <p className="font-black text-slate-800 text-xl">{stats.pendingOrders || 0}</p>
            </div>
          </div>
        </div>

        {/* Charts Container */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-1 sm:p-2 overflow-hidden">
          <DashboardCharts />
        </div>

        {/* Neumorphic Quick Actions */}
        <h2 className="text-lg font-bold text-slate-800 mt-4 mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/pharmacy/rx-requests" className="group bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="p-2 bg-blue-50 rounded-xl mb-3 relative z-10 group-hover:bg-blue-100 transition-colors"><Pill size={22} className="text-blue-600" /></div>
            <h3 className="font-bold text-slate-800 text-sm relative z-10">Rx Requests</h3>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Incoming prescriptions</p>
          </Link>
          
          <Link href="/pharmacy/pos" className="group bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col items-start relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="p-2 bg-emerald-50 rounded-xl mb-3 relative z-10 group-hover:bg-emerald-100 transition-colors"><ShoppingCart size={22} className="text-emerald-600" /></div>
            <h3 className="font-bold text-slate-800 text-sm relative z-10">POS Terminal</h3>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Create a new sale</p>
          </Link>

          <Link href="/pharmacy/inventory" className="group bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col items-start relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="p-2 bg-orange-50 rounded-xl mb-3 relative z-10 group-hover:bg-orange-100 transition-colors"><Package size={22} className="text-orange-600" /></div>
            <h3 className="font-bold text-slate-800 text-sm relative z-10">Inventory</h3>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Manage stock & expiry</p>
          </Link>

          <Link href="/pharmacy/orders" className="group bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col items-start relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="p-2 bg-purple-50 rounded-xl mb-3 relative z-10 group-hover:bg-purple-100 transition-colors"><ClipboardList size={22} className="text-purple-600" /></div>
            <h3 className="font-bold text-slate-800 text-sm relative z-10">Orders List</h3>
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">View all sales</p>
          </Link>
        </div>

      </div>
    </div>
  );
}
