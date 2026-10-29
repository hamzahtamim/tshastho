"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
          SUPER_ADMIN: "/admin",
          DOCTOR: "/doctor",
          DOCTOR_STAFF: "/doctor",
          PHARMACY_OWNER: "/pharmacy",
          PHARMACY_STAFF: "/staff",
          DIAGNOSTIC_OWNER: "/diagnostic",
          HOSPITAL_ADMIN: "/hospital",
          CUSTOMER: "/dashboard",
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            Tshastho
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 mt-4">
            Welcome Back!
          </h2>
          <p className="text-slate-500 text-sm mt-1">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email or Phone
            </label>
            <Input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="text"
              placeholder="Enter email or phone"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          {message && (
            <p className="text-center text-sm font-medium text-blue-600">
              {message}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-center text-sm text-slate-500 mb-3">
            Don't have an account?
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/register"
              className="text-center bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-medium hover:bg-slate-200"
            >
              Patient
            </Link>
            <Link
              href="/register/doctor"
              className="text-center bg-blue-50 text-blue-600 py-2.5 rounded-xl text-xs font-medium hover:bg-blue-100"
            >
              Doctor
            </Link>
            <Link
              href="/register/pharmacy"
              className="text-center bg-purple-50 text-purple-600 py-2.5 rounded-xl text-xs font-medium hover:bg-purple-100"
            >
              Pharmacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
