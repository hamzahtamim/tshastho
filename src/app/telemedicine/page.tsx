"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { Video, ShieldCheck, Clock, FileText, ArrowRight, Star } from "lucide-react";

export default function PublicTelemedicinePage() {
  const { user } = useAuth();
  const { branding } = useBranding();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* Simple Header for Public Page */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {branding.logo ? (
              <img src={branding.logo} alt="Tshastho" className="h-10 object-contain" />
            ) : (
              <span className="text-2xl font-black text-blue-600 tracking-tight">Tshastho</span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-blue-700 transition">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Log in</Link>
                <Link href="/register" className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-blue-700 transition">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-200/40 rounded-full blur-3xl -z-10"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Trusted by Top Doctors in Bangladesh
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            Consult Top Doctors <br className="hidden md:block"/>
            From <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Home</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 font-medium">
            Get expert medical advice, prescriptions, and follow-ups via secure video calls. No waiting rooms, 100% private.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href={user ? "/dashboard/telemedicine" : "/login"} 
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              <Video size={20} /> 
              {user ? "Start a Consultation" : "Login to Consult"}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-3">Why Choose Telemedicine?</h2>
            <p className="text-slate-500 text-lg">Experience healthcare from the comfort of your home.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">100% Secure & Private</h3>
              <p className="text-slate-500 text-sm">Your consultations are end-to-end encrypted. Your health data is safe with us.</p>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">24/7 Availability</h3>
              <p className="text-slate-500 text-sm">Connect with doctors anytime, anywhere. No more waiting for clinic hours.</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl text-center border border-slate-100">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">Digital Prescriptions</h3>
              <p className="text-slate-500 text-sm">Get valid digital prescriptions instantly after the call, delivered to your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 bg-slate-900 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to see a doctor?</h2>
        <Link 
          href={user ? "/dashboard/telemedicine" : "/login"} 
          className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-3.5 rounded-full font-bold text-lg hover:bg-blue-50 transition shadow-lg"
        >
          {user ? "Go to My Consultations" : "Get Started Now"} <ArrowRight size={20} />
        </Link>
      </section>

    </div>
  );
}
