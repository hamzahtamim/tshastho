"use client";
import { useEffect, useState } from "react";
import { Save, ArrowLeft, PhoneCall } from "lucide-react";
import Link from "next/link";

export default function HotlineSettingsPage() {
  const [hotlineNumber, setHotlineNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings/hotline')
      .then(res => res.json())
      .then(data => {
        if (data.success) setHotlineNumber(data.hotlineNumber);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/settings/hotline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotlineNumber })
    });
    if (res.ok) alert('✅ Hotline number updated!');
    else alert('❌ Failed to update');
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <PhoneCall className="text-blue-600" /> Hotline Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4">
          This number will be used globally for the "Hotline" button across the platform.
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Support Hotline Number</label>
          <input 
            type="text" 
            value={hotlineNumber} 
            onChange={e => setHotlineNumber(e.target.value)}
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-lg" 
            placeholder="e.g., 01737326555"
            required
          />
        </div>
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
          <Save size={18} /> {saving ? 'Saving...' : 'Save Hotline Number'}
        </button>
      </form>
    </div>
  );
}
