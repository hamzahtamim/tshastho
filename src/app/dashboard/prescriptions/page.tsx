"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Plus, X, Upload, Eye, Clock, CheckCircle, XCircle, FileImage, ShieldCheck, AlertTriangle 
} from "lucide-react";

export default function MyPrescriptionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    imageUrl: "",
    doctorName: "",
    hospitalName: "",
    diagnosis: "",
    notes: "",
    items: [{ medicineName: "", strength: "", dosage: "", frequency: "", duration: "", quantity: "" }],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prescriptions", { credentials: "include" });
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(f => ({ ...f, imageUrl: data.url }));
      } else {
        setMessage("Upload failed");
      }
    } catch {
      setMessage("Upload error");
    }
    setUploading(false);
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { medicineName: "", strength: "", dosage: "", frequency: "", duration: "", quantity: "" }] }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length === 1) return;
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) { setMessage("Please upload prescription image"); return; }
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/prescriptions/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        items: form.items.filter((i) => i.medicineName.trim()),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setShowForm(false);
      setForm({ imageUrl: "", doctorName: "", hospitalName: "", diagnosis: "", notes: "", items: [{ medicineName: "", strength: "", dosage: "", frequency: "", duration: "", quantity: "" }] });
      load();
    } else {
      setMessage(data.message || "Failed to upload");
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "VERIFIED": return <span className="bg-emerald-100 text-emerald-700 border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1"><ShieldCheck size={12}/> Verified</span>;
      case "REJECTED": return <span className="bg-red-100 text-red-700 border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1"><XCircle size={12}/> Rejected</span>;
      case "PENDING": default: return <span className="bg-amber-100 text-amber-700 border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1"><Clock size={12}/> Under Review</span>;
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} /> My Prescriptions
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your medical records</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all">
          <Plus size={16} /> Upload
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileImage className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No prescriptions yet</h3>
          <p className="text-slate-500 text-sm mb-6">Upload your first prescription to keep your records safe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prescriptions.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex gap-4">
                {/* Image Thumbnail or Icon */}
                <div className="w-16 h-20 rounded-xl border border-slate-200 bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="Rx" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="text-blue-400" size={24} />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col py-1">
                  <div className="mb-2">{getStatusBadge(p.status)}</div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                    {p.doctorName ? `Dr. ${p.doctorName}` : 'Digital Prescription'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{p.items?.length || 0} medicines</p>
                  <p className="text-[11px] text-slate-400 mt-auto pt-2">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <button 
                onClick={() => router.push(`/dashboard/prescriptions/${p.id}`)}
                className="w-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye size={14} /> View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom sm:animate-none">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="font-bold text-lg text-slate-800">Upload Prescription</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Prescription Image *</label>
                {form.imageUrl ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-300 group">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: "" }))} className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors bg-slate-50/50">
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-700">{uploading ? "Uploading..." : "Click to upload image"}</span>
                    <span className="text-xs text-slate-500 mt-1">JPG, PNG up to 5MB</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* Doctor & Hospital */}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Doctor Name" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-500" />
                <input type="text" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} placeholder="Hospital/Clinic" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-500" />
              </div>

              {/* Diagnosis */}
              <input type="text" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Diagnosis (Optional)" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-500" />

              {/* Dynamic Medicines */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-slate-800">Medicines (Optional)</label>
                  <button type="button" onClick={addItem} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-600 p-1">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <input type="text" value={it.medicineName} onChange={(e) => updateItem(idx, "medicineName", e.target.value)} placeholder="Medicine Name" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={it.strength} onChange={(e) => updateItem(idx, "strength", e.target.value)} placeholder="Strength (e.g. 500mg)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500" />
                        <input type="text" value={it.frequency} onChange={(e) => updateItem(idx, "frequency", e.target.value)} placeholder="Frequency (e.g. 1+0+1)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-500" />

              {message && <p className="text-sm text-center text-red-600 bg-red-50 p-2 rounded-lg">{message}</p>}

              <button type="submit" disabled={saving || uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {saving ? "Uploading..." : "Save Prescription"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
