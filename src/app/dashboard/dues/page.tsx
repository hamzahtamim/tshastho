"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, Phone, Store, AlertCircle, ShoppingBag, CheckCircle } from "lucide-react";
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
  }, [user, authLoading]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">My Dues</h1>

      {dues.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-100">
          <CheckCircle size={64} className="mx-auto text-green-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">No Dues! 🎉</h2>
          <p className="text-sm text-slate-500 mb-6">You have no outstanding payments</p>
          <Link href="/medicines" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium">
            Browse Medicines
          </Link>
        </div>
      ) : (
        <>
          {/* Total Due Card */}
          <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-2xl p-5 mb-4 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <p className="text-xs uppercase font-bold tracking-wider text-red-100">Total Outstanding</p>
            </div>
            <p className="text-3xl font-bold">৳{totalDue.toFixed(2)}</p>
            <p className="text-xs text-red-100 mt-1">{dues.length} pharmacies to pay</p>
          </div>

          <div className="space-y-3">
            {dues.map((due) => {
              const remaining = parseFloat(due.amount.toString()) - parseFloat(due.paidAmount.toString());
              return (
                <div key={due.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-start gap-3 mb-3">
                    {due.pharmacy?.logo ? (
                      <img src={due.pharmacy.logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                        {due.pharmacy?.shopName?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{due.pharmacy?.shopName}</p>
                      <p className="text-xs text-slate-500 truncate">{due.pharmacy?.city}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(due.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      due.status === "PAID" ? "bg-green-100 text-green-600" :
                      due.status === "PARTIAL" ? "bg-yellow-100 text-yellow-600" :
                      "bg-red-100 text-red-600"
                    }`}>{due.status}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-xs mb-3">
                    <div className="text-center">
                      <p className="text-slate-500">Total</p>
                      <p className="font-bold text-slate-800">৳{parseFloat(due.amount.toString()).toFixed(2)}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-slate-500">Paid</p>
                      <p className="font-bold text-green-600">৳{parseFloat(due.paidAmount.toString()).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-600">Due</p>
                      <p className="font-bold text-red-600">৳{remaining.toFixed(2)}</p>
                    </div>
                  </div>

                  {due.note && (
                    <p className="text-[10px] text-slate-500 bg-yellow-50 p-2 rounded-lg mb-3">{due.note}</p>
                  )}

                  <div className="flex gap-2">
                    {due.pharmacy?.user?.phone && (
                      <a href={`tel:${due.pharmacy.phone}`} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded-xl text-xs font-medium">
                        <Phone size={12} /> Call to Pay
                      </a>
                    )}
                    {due.orderId && (
                      <Link href={`/dashboard/orders/${due.orderId}`} className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-medium">
                        <ShoppingBag size={12} /> View Order
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
