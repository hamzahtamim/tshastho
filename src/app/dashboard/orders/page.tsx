"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Package, Clock, CheckCircle, Truck, XCircle, Store, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PatientOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    const email = user?.email;
    if (!email) { setLoading(false); return; }

    fetch("/api/orders/my-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.orders) setOrders(data.orders);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const statusInfo = (status: string) => {
    switch (status) {
      case "PENDING": return { icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" };
      case "ACCEPTED": return { icon: CheckCircle, color: "bg-blue-50 text-blue-700 border-blue-200", label: "Accepted" };
      case "OUT_FOR_DELIVERY": return { icon: Truck, color: "bg-purple-50 text-purple-700 border-purple-200", label: "On the way" };
      case "DELIVERED": return { icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Delivered" };
      case "REJECTED": return { icon: XCircle, color: "bg-red-50 text-red-700 border-red-200", label: "Rejected" };
      case "CANCELLED": return { icon: XCircle, color: "bg-slate-100 text-slate-600 border-slate-200", label: "Cancelled" };
      default: return { icon: Package, color: "bg-slate-100 text-slate-600 border-slate-200", label: status };
    }
  };

  const filterButtons = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "OUT_FOR_DELIVERY", label: "Delivering" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const filtered = filter === "ALL" ? orders : orders.filter(o => o.status === filter);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
            <p className="text-sm text-slate-500">Track your medicine deliveries</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                filter === f.key
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filtered.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center border border-slate-100 shadow-sm mt-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={40} className="text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No orders found</h2>
            <p className="text-slate-500 text-sm mb-6">Looks like you haven't placed any orders in this category yet.</p>
            <Link href="/medicines" className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">
              Browse Medicines
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const s = statusInfo(order.status);
              const StatusIcon = s.icon;
              return (
                <div key={order.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* Top section */}
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                    <div>
                      <p className="font-bold text-slate-900 text-base">{order.orderNumber}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Store size={14} />
                        <span className="font-medium truncate max-w-[150px]">{order.pharmacy?.shopName || 'Pharmacy'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${s.color}`}>
                      <StatusIcon size={12} /> {s.label}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2 mb-4">
                    {order.items.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 font-medium truncate pr-4">{item.medicineName} <span className="text-slate-400 font-normal">x{item.quantity}</span></span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-blue-600 font-medium">+{order.items.length - 3} more items</p>
                    )}
                  </div>

                  {/* Bottom section */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total Amount</p>
                      <p className="font-bold text-lg text-slate-900">৳{parseFloat(order.finalAmount).toFixed(2)}</p>
                    </div>
                    <Link href={`/dashboard/orders/${order.id}`} className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors">
                      View Details <ChevronRight size={16} />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
