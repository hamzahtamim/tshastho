"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

export default function Login() {
  const router = useRouter();
  const { branding } = useBranding();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  
  const handleGoogleLogin = async (tokenResponse: any) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenResponse.access_token }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        setMessage(data.message || "Google login failed");
      }
    } catch (err) {
      setMessage("Network error during Google login");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleLogin,
    onError: () => setMessage("Google Login Failed"),
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage("Login Successful! Redirecting...");
        const role = data.user?.role;
        const routes: Record<string, string> = {
          SUPER_ADMIN: "/admin", DOCTOR: "/doctor", DOCTOR_STAFF: "/doctor",
          PHARMACY_OWNER: "/pharmacy", PHARMACY_STAFF: "/staff",
          DIAGNOSTIC_OWNER: "/diagnostic", HOSPITAL_ADMIN: "/hospital", CUSTOMER: "/dashboard",
        };
        const target = routes[role] || "/dashboard";
        setTimeout(() => router.push(target), 800);
      } else {
        setMessage(data.message || data.error || "Invalid credentials");
      }
    } catch (error) {
      setMessage("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 p-4 relative overflow-hidden">

      {/* Floating Back to Home Button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-700 hover:text-blue-600 font-bold transition-all bg-white/70 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-200/50 z-20"
      >
        <ArrowLeft size={18} /> Home
      </Link>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
      
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white p-8 relative z-10">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img 
              src={branding.logo || "/logo.png"} 
              alt="Tshastho" 
              className="h-12 md:h-14 w-auto object-contain mx-auto" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML += '<span class="text-3xl font-black text-blue-600 tracking-tighter">Tshastho</span>';
              }}
            />
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">Welcome Back!</h2>
          <p className="text-slate-500 text-sm mt-2">Log in to continue to your account</p>
        </div>

        
        {/* Google Login Button */}
        <button
          onClick={() => loginWithGoogle()}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Or login with email</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email or Phone</label>
            <Input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="text"
              placeholder="Enter email or phone"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {message && (
            <div className={`text-center text-sm font-medium p-3 rounded-lg ${message.includes('Success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full py-6 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-center text-sm text-slate-500 mb-4">Don't have an account?</p>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/register" className="text-center bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors">
              Patient
            </Link>
            <Link href="/register/doctor" className="text-center bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-xl text-xs font-bold transition-colors">
              Doctor
            </Link>
            <Link href="/register/pharmacy" className="text-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2.5 rounded-xl text-xs font-bold transition-colors">
              Pharmacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
