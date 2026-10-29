"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = () => {
    fetch('/api/admin/payouts')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPayouts(data.payouts);
        setLoading(false);
      });
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    let reason = "";
    if (status === 'REJECTED') {
      reason = prompt("Rejection reason:") || "Invalid account details";
    } else {
      const msg = status === 'COMPLETED' 
        ? "Confirm you have transferred the money to this account?" 
        : "Approve this payout request? (Note: Money not yet sent)";
      if (!confirm(msg)) return;
    }

    const res = await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutId: id, status, reason }),
    });

    if (res.ok) {
      alert(`✅ Payout ${status.toLowerCase()}!`);
      fetchPayouts();
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Doctor Payout Requests</h1>
      </div>

      {payouts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-100">
          <p className="text-slate-500">No payout requests found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payouts.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-lg">{p.doctor?.user?.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    p.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 font-semibold mb-2">
                  Amount: <span className="text-emerald-600 text-lg">৳ {Number(p.amount).toFixed(2)}</span>
                </p>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold mb-1">Payout Destination:</p>
                  {p.payoutMethod ? (
                    <div className="text-sm text-slate-800">
                      <span className="font-bold">{p.payoutMethod.methodType}</span> • {p.payoutMethod.accountNumber} <br/>
                      <span className="text-xs text-slate-500">{p.payoutMethod.accountName} {p.payoutMethod.bankName && `(${p.payoutMethod.bankName})`}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-500">No specific method linked. Check Doctor profile.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[150px]">
                {p.status === 'REQUESTED' && (
                  <>
                    <button onClick={() => handleAction(p.id, 'APPROVED')} className="flex items-center justify-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                      <CheckCircle size={16}/> Approve Request
                    </button>
                    <button onClick={() => handleAction(p.id, 'REJECTED')} className="flex items-center justify-center gap-1 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition">
                      <XCircle size={16}/> Reject
                    </button>
                  </>
                )}

                {p.status === 'APPROVED' && (
                  <button onClick={() => handleAction(p.id, 'COMPLETED')} className="flex items-center justify-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-md">
                    <CheckCircle size={16}/> Mark as Paid
                  </button>
                )}

                {p.status === 'COMPLETED' && (
                  <div className="text-center p-2 bg-green-50 rounded-lg text-green-700 text-xs font-bold flex flex-col items-center">
                    <CheckCircle size={20} className="mb-1"/> Money Transferred
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
