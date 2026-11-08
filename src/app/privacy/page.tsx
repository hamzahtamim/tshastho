"use client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/register" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Registration
        </Link>
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
          <div className="prose prose-slate text-slate-600 text-sm leading-relaxed space-y-4">
            <p>At Tshastho, your privacy is our top priority. This policy explains how we collect, use, and protect your health information.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">1. Data We Collect</h3>
            <p>We collect personal details (name, email, phone), medical history, and appointment records to provide you with the best healthcare experience.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">2. HIPAA & Data Protection</h3>
            <p>We adhere to strict data protection protocols. Your medical records are encrypted and only accessible to doctors you explicitly grant access to via our Consent Management system.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">3. Third-Party Sharing</h3>
            <p>We never sell your data. We only share necessary information with pharmacies or diagnostic centers when you explicitly place an order or book a test.</p>
            <p className="mt-8 text-xs text-slate-400">Last updated: November 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
