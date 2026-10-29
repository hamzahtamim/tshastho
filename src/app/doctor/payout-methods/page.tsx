"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ShieldAlert, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PayoutMethodsPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    methodType: "BKASH",
    accountName: "",
    accountNumber: "",
    bankName: "",
    isDefault: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/doctor/payout-methods', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/doctor/update-profile', { credentials: 'include' }).then(r => r.json())
      ]);
      
      if (mRes.success) setMethods(mRes.methods);
      if (pRes.doctor) {
        setIsVerified(pRes.doctor.verificationStatus === 'VERIFIED');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch('/api/doctor/payout-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ methodType: "BKASH", accountName: "", accountNumber: "", bankName: "", isDefault: false });
        loadData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    await fetch(`/api/doctor/payout-methods/${id}`, { method: 'DELETE', credentials: 'include' });
    loadData();
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/doctor/payout-methods/${id}`, { method: 'PUT', credentials: 'include' });
    loadData();
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading methods...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-screen pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/doctor/payouts" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payment Methods</h1>
            <p className="text-slate-500 text-sm">Manage your withdrawal accounts.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          disabled={!isVerified}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus size={16} /> Add Method
        </button>
      </div>

      {/* KYC Warning */}
      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
          <ShieldAlert className="text-amber-500 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-amber-800 text-sm">KYC Verification Required</h3>
            <p className="text-amber-700 text-xs mt-1">
              To add a payment method and withdraw funds, you must complete your KYC verification. 
              Please go to your profile and upload your NID and Medical License.
            </p>
            <Link href="/doctor/profile" className="text-amber-800 text-xs font-bold underline mt-2 inline-block">Go to Profile</Link>
          </div>
        </div>
      )}

      {methods.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No payment methods yet</h3>
          <p className="text-slate-500 text-sm text-center max-w-sm mb-6">Add your bKash, Nagad, or Bank account to receive your earnings.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {methods.map((m) => (
            <div key={m.id} className={`bg-white p-5 rounded-2xl border ${m.isDefault ? 'border-blue-300 ring-1 ring-blue-100 shadow-md' : 'border-slate-200 shadow-sm'} flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600">
                  {m.methodType === 'BKASH' ? 'bK' : m.methodType === 'NAGAD' ? 'Ng' : m.methodType === 'ROCKET' ? 'Rk' : 'Bk'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-lg">{m.accountNumber}</h3>
                    {m.isDefault && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Default</span>}
                  </div>
                  <p className="text-sm text-slate-600">{m.accountName} {m.bankName && `• ${m.bankName}`}</p>
                  <p className="text-xs text-slate-400 mt-1">Type: {m.methodType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!m.isDefault && (
                  <button onClick={() => handleSetDefault(m.id)} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition">
                    Set Default
                  </button>
                )}
                <button onClick={() => handleDelete(m.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Payment Method</h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Method Type</label>
                <select 
                  value={form.methodType}
                  onChange={(e) => setForm({ ...form, methodType: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              {form.methodType === 'BANK' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Bank Name</label>
                  <input type="text" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. City Bank" />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Account Holder Name</label>
                <input type="text" required value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name as in account" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Account Number</label>
                <input type="text" required value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 017XXXXXXXX" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                <span className="text-sm font-bold text-slate-700">Set as Default Method</span>
              </label>

              <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-4">
                {saving ? "Saving..." : "Save Method"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
