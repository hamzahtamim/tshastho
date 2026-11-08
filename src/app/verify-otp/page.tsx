"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle, RefreshCw } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const { branding } = useBranding();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setError(data.message || "Verification failed.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to resend OTP.");
      } else {
        alert("A new OTP has been sent to your email.");
      }
    } catch (err) {
      setError("Network error.");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-red-600 mb-2">Missing Email</h2>
          <p className="text-slate-500 mb-4">We couldn't find an email address to verify.</p>
          <Link href="/register" className="text-blue-600 font-bold hover:underline">Go back to Register</Link>
        </div>
      </div>
    );
  }

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
              e.currentTarget.parentElement!.innerHTML += '<span class="text-3xl font-black text-blue-600 tracking-tighter">Tshastho</span>';
            }}
          />
          <h2 className="text-2xl font-bold text-slate-800">Verify Your Email</h2>
          <p className="text-slate-500 text-sm mt-2">We sent a 6-digit code to <br/><b className="text-slate-800">{email}</b></p>
        </div>

        {success ? (
          <div className="text-center bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
            <CheckCircle className="mx-auto text-emerald-500 mb-3" size={40} />
            <h3 className="font-bold text-emerald-800 mb-2">Verified Successfully!</h3>
            <p className="text-sm text-emerald-700">Redirecting you to the login page...</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Enter 6-digit code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-slate-900"
                maxLength={6}
                required
              />
            </div>

            {error && <p className="text-sm text-center text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {resending ? "Resending..." : "Resend OTP"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Loading...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
