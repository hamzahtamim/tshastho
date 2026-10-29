"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Plus, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorPayoutsPage() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ amount: "", method: "BKASH", accountNumber: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch('/api/doctor/payouts', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/doctor/earnings', { credentials: 'include' }).then(r => r.json()),
      ]);
      if (pRes.success) setPayouts(pRes.payouts);
      if (eRes.success) setEarnings(eRes.summary.available);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch('/api/doctor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ amount: "", method: "BKASH", accountNumber: "" });
        setMessage("✅ Payout requested successfully!");
        setTimeout(() => setMessage(""), 3000);
        loadData();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "PENDING": return "bg-amber-100 text-amber-700";
      case "APPROVED": return "bg-green-100 text-green-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const availableAmount = earnings?.amount || 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-[80vh]">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/doctor/earnings" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">My Payouts</h1>
          <Link href="/doctor/payout-methods" className="text-sm font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">
            Manage Payment Methods
          </Link>
        </div>
      </div>

      {message && <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium text-center">{message}</div>}

      {/* Available Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white mb-8 shadow-lg flex justify-between items-center">
        <div>
          <p className="text-emerald-100 text-sm mb-1">Available to Withdraw</p>
          <p className="text-3xl font-bold">৳ {Number(availableAmount).toFixed(2)}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          disabled={availableAmount < 100}
          className="bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Request Payout
        </button>
      </div>

      {/* Payout History */}
      <h2 className="text-lg font-bold text-slate-800 mb-4">Payout History</h2>
      
      {payouts.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <CreditCard size={32} />
          </div>
          <p className="text-slate-500 font-medium">No payout requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div key={payout.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">৳ {Number(payout.amount).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{payout.method} • {payout.accountNumber}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(payout.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(payout.status)}`}>
                {payout.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Request Payout</h3>
            <p className="text-sm text-slate-500 mb-6">Withdraw your available earnings.</p>
            
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount (৳)</label>
                <input 
                  type="number" 
                  required
                  min="100"
                  max={availableAmount}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Min 100 BDT"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Method</label>
                <select 
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Account Number</label>
                <input 
                  type="text" 
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. 017XXXXXXXX"
                />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50 mt-2">
                {submitting ? "Processing..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
