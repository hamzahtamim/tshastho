"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Phone, AlertCircle, ShoppingBag, Store, CheckCircle, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PatientDuesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [dues, setDues] = useState<any[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const email = user?.email;
    if (!email) { router.push("/login"); return; }

    fetch("/api/orders/my-dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.dues) setDues(data.dues);
        if (data.totalDue !== undefined) setTotalDue(data.totalDue);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authLoading, router]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (loading || authLoading) {
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
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Dues</h1>
            <p className="text-sm text-slate-500">Manage your outstanding payments</p>
          </div>
        </div>

        {dues.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">You're all caught up!</h2>
            <p className="text-slate-500 text-sm mb-6">You have no outstanding dues or pending payments.</p>
            <Link href="/medicines" className="inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Total Outstanding Card */}
            <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-rose-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-rose-100">
                    <AlertCircle size={18} />
                    <p className="text-sm font-bold uppercase tracking-wider">Total Outstanding</p>
                  </div>
                  <p className="text-4xl font-black mb-1">৳{totalDue.toFixed(2)}</p>
                  <p className="text-sm text-rose-100">Across {dues.length} pharmacies</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Receipt size={32} />
                </div>
              </div>
            </div>

            {/* Dues List */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Breakdown by Pharmacy</h2>
              {dues.map((due) => {
                const remaining = parseFloat(due.amount.toString()) - parseFloat(due.paidAmount.toString());
                return (
                  <div key={due.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <Store size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{due.pharmacy?.shopName}</p>
                          <p className="text-xs text-slate-500">{due.pharmacy?.city}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        due.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        due.status === "PARTIAL" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {due.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 mb-4">
                      <div className="text-center border-r border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total</p>
                        <p className="font-bold text-slate-700">৳{parseFloat(due.amount.toString()).toFixed(2)}</p>
                      </div>
                      <div className="text-center border-r border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Paid</p>
                        <p className="font-bold text-emerald-600">৳{parseFloat(due.paidAmount.toString()).toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Due</p>
                        <p className="font-bold text-rose-600">৳{remaining.toFixed(2)}</p>
                      </div>
                    </div>

                    {due.note && (
                      <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100 mb-4 flex items-start gap-2">
                        <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        {due.note}
                      </p>
                    )}

                    <div className="flex gap-3">
                      {due.pharmacy?.user?.phone && (
                        <a href={`tel:${due.pharmacy.user.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2.5 rounded-xl text-sm font-bold transition-colors">
                          <Phone size={16} /> Call to Pay
                        </a>
                      )}
                      {due.orderId && (
                        <Link href={`/dashboard/orders/${due.orderId}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 py-2.5 rounded-xl text-sm font-bold transition-colors">
                          <ShoppingBag size={16} /> View Order
                        </Link>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
