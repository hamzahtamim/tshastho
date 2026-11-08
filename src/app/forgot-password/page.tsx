"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

export default function ForgotPassword() {
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, origin: window.location.origin }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to send reset link.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 p-4 relative overflow-hidden">
      <Link 
        href="/login" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-700 hover:text-blue-600 font-bold transition-all bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-200/50 z-20"
      >
        <ArrowLeft size={18} /> Back to Login
      </Link>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white p-8 relative z-10">
        <div className="text-center mb-8">
          <img 
            src={branding.logo || "/logo.png"} 
            alt="Tshastho" 
            className="h-12 w-auto object-contain mx-auto mb-6" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML += '<span class="text-3xl font-black text-blue-600">Tshastho</span>';
            }}
          />
          <h2 className="text-2xl font-bold text-slate-800">Forgot Password?</h2>
          <p className="text-slate-500 text-sm mt-2">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {success ? (
          <div className="text-center bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
            <CheckCircle className="mx-auto text-emerald-500 mb-3" size={40} />
            <h3 className="font-bold text-emerald-800 mb-2">Check your email</h3>
            <p className="text-sm text-emerald-700">We've sent a password reset link to <b>{email}</b>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-center text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30 mt-2"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
