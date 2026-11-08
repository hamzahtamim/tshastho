"use client";
import Link from "next/link";
import { Construction, LayoutDashboard, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PlaceholderPage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Construction size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Coming Soon!</h1>
        <p className="text-slate-500 mb-8 text-sm">We are working hard to bring this service to you. Stay tuned for updates.</p>
        
        <Link 
          href={isLoggedIn ? "/dashboard" : "/"} 
          className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
        >
          {isLoggedIn ? (
            <><LayoutDashboard size={18} /> Back to Dashboard</>
          ) : (
            <><Home size={18} /> Back to Home</>
          )}
        </Link>

      </div>
    </div>
  );
}