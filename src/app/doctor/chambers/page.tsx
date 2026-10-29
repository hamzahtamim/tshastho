"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, MapPin, Phone, Clock, Wallet, Plus, Edit, Trash2, X, CheckCircle, Star } from "lucide-react";

export default function ChambersPage() {
  const { user } = useAuth();
  const [chambers, setChambers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    address: "",
    area: "",
    city: "",
    phone: "",
    defaultFee: 0,
    isPrimary: false,
    operatingHours: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/chambers", { credentials: "include" });
      const data = await res.json();
      setChambers(data.chambers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const resetForm = () => {
    setForm({ name: "", address: "", area: "", city: "", phone: "", defaultFee: 0, isPrimary: false, operatingHours: "", notes: "" });
    setEditing(null);
    setMessage("");
  };

  const handleEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      address: c.address || "",
      area: c.area || "",
      city: c.city || "",
      phone: c.phone || "",
      defaultFee: Number(c.defaultFee) || 0,
      isPrimary: c.isPrimary || false,
      operatingHours: c.operatingHours || "",
      notes: c.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const url = editing ? `/api/doctor/chambers/${editing.id}` : "/api/doctor/chambers";
      const method = editing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowForm(false);
        resetForm();
        load();
      } else {
        setMessage(data.message || data.error || "Failed to save chamber.");
      }
    } catch (err) {
      setMessage("Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this chamber?")) return;
    await fetch(`/api/doctor/chambers/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-[80vh] pb-24 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            My Chambers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your practice locations and clinic details for patients.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm"
        >
          <Plus size={18} /> Add New Chamber
        </button>
      </div>

      {message && !showForm && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center border border-red-100">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading chambers...</div>
      ) : chambers.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Building2 size={40} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-2">No chambers added yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">Add your clinic or chamber details so patients know where to find you.</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 transition shadow-sm">
            Add First Chamber
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {chambers.map((c) => (
            <div key={c.id} className={`bg-white rounded-3xl border p-6 relative shadow-sm hover:shadow-md transition-all ${c.isPrimary ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
              {c.isPrimary && (
                <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Star size={10} className="fill-white" /> Primary Chamber
                </div>
              )}
              
              <div className="flex justify-between items-start mb-4 mt-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                  <p className="text-sm font-medium text-blue-600 flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {c.area || c.city || "Location not set"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl mb-4">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{c.address}, {c.area} {c.city}</span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.operatingHours && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400 shrink-0" />
                    <span>{c.operatingHours}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <Wallet size={16} className="text-emerald-500" />
                  <span className="text-xs text-slate-500">Default Fee:</span>
                  <span className="font-bold text-slate-800">৳ {Number(c.defaultFee).toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Premium Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? "Edit Chamber Details" : "Add New Chamber"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-white rounded-full shadow-sm transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="chamber-form" onSubmit={handleSubmit} className="space-y-5">
                {message && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                    <X size={16} /> {message}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Chamber / Clinic Name <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Popular Diagnostic Centre" className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Full Address <span className="text-red-500">*</span></label>
                  <textarea required rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Room 402, 4th Floor, House 12, Road 5..." className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Area</label>
                    <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Dhanmondi" className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">City</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Dhaka" className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Contact Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 017XXXXXXXX" className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Operating Hours</label>
                    <input value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} placeholder="e.g. 5 PM - 9 PM, Sat-Thu" className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Default Fee (৳)</label>
                    <input type="number" min="0" value={form.defaultFee} onChange={(e) => setForm({ ...form, defaultFee: Number(e.target.value) })} className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-3 cursor-pointer bg-blue-50/50 px-4 py-3 border-2 border-blue-100 rounded-xl w-full hover:bg-blue-50 transition-colors">
                      <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                      <span className="text-sm font-bold text-slate-700">Set as Primary Chamber</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-2 uppercase tracking-wider">Notes (Optional)</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Patients are seen only with prior appointments." className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm" />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition mr-3">
                Cancel
              </button>
              <button type="submit" form="chamber-form" disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30">
                {saving ? "Saving..." : <><CheckCircle size={18} /> {editing ? "Update Chamber" : "Save Chamber"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
