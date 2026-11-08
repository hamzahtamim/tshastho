"use client";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/register" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Registration
        </Link>
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <FileText size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
          <div className="prose prose-slate text-slate-600 text-sm leading-relaxed space-y-4">
            <p>Welcome to Tshastho. By accessing or using our platform, you agree to be bound by these Terms of Service.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">1. Medical Disclaimer</h3>
            <p>Tshastho does not provide medical advice, diagnosis, or treatment. The content on our platform is for informational purposes only. Always seek the advice of a qualified healthcare provider for any medical conditions.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">2. User Responsibilities</h3>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for providing accurate personal and medical information during registration and consultations.</p>
            <h3 className="text-slate-900 font-bold text-lg mt-6">3. Privacy & Data Security</h3>
            <p>Your medical data is highly sensitive. We implement state-of-the-art encryption to protect your data. Please refer to our Privacy Policy for detailed information on how we handle your data.</p>
            <p className="mt-8 text-xs text-slate-400">Last updated: November 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
