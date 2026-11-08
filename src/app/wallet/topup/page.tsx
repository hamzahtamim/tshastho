"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, Building2, Smartphone, CheckCircle2 } from "lucide-react";

export default function WalletTopupPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [topupType, setTopupType] = useState("AUTOMATED");
  const [amount, setAmount] = useState<number | string>("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [trxId, setTrxId] = useState("");

  useEffect(() => {
    fetch('/api/payment-methods')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMethods(Array.isArray(data.methods) ? data.methods : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAutomated = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch('/api/payments/initiate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), purpose: "WALLET_TOPUP", gateway: "SSLCOMMERZ" })
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || "Top-up failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || !trxId) {
      setError("Please select a method and enter Transaction ID.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch('/api/wallet/topup/manual', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method: selectedMethod, trxId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Request failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeMethodDetails = methods.find((m) => m.method === selectedMethod);

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
        <p className="text-slate-600 mb-6 max-w-sm">Your manual top-up request is pending. Admin will verify your Transaction ID and add the balance shortly.</p>
        <Link href="/wallet" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium">Back to Wallet</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/wallet" className="p-2 bg-white rounded-full shadow-sm">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Top Up Wallet</h1>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
          <button
            onClick={() => { setTopupType("AUTOMATED"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${topupType === "AUTOMATED" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}
          >
            Automatic (Instant)
          </button>
          <button
            onClick={() => { setTopupType("MANUAL"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${topupType === "MANUAL" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"}`}
          >
            Manual (Admin)
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          {topupType === "AUTOMATED" ? (
            <form onSubmit={handleAutomated} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount (e.g. 500)"
                />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                <CreditCard size={18} /> {submitting ? "Processing..." : "Proceed to Pay"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManual} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Payment Method</label>
                <select
                  required
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Method --</option>
                  {methods.map((m) => (
                    <option key={m.method} value={m.method}>
                      {m.method.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* CRITICAL FIX: Safe check for activeMethodDetails */}
              {activeMethodDetails && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl space-y-2 p-3">
                  <p className="text-sm text-blue-800 font-medium">Send <b>Tk {amount || '0'}</b> to:</p>
                  <div className="flex items-center gap-2">
                    {activeMethodDetails.accountType === 'BANK' ? (
                      <Building2 size={20} className="text-blue-600" />
                    ) : (
                      <Smartphone size={20} className="text-blue-600" />
                    )}
                    <span className="text-sm font-bold text-blue-900">{activeMethodDetails.accountNumber}</span>
                  </div>
                  <p className="text-sm text-blue-700">Account Name: {activeMethodDetails.accountName}</p>
                  <p className="text-sm text-blue-700">Instructions: {activeMethodDetails.instructions}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter TrxID after sending money"
                />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
              <button type="submit" disabled={submitting} className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
