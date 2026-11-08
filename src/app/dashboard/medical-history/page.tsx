"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Heart, AlertTriangle, Pill, Users, Plus, X, Trash2, Activity,
  Calendar, ShieldAlert
} from "lucide-react";

const ALLERGY_TYPES = ["DRUG", "FOOD", "ENVIRONMENTAL", "OTHER"];
const SEVERITY = ["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"];
const CONDITION_TYPES = ["CONDITION", "SURGERY", "HOSPITALIZATION", "PROCEDURE"];

export default function MedicalHistoryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"allergies" | "conditions" | "medications" | "family">("allergies");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [allergyForm, setAllergyForm] = useState({ allergen: "", type: "DRUG", severity: "MODERATE", reaction: "" });
  const [conditionForm, setConditionForm] = useState({ name: "", type: "CONDITION", diagnosedDate: "", hospital: "", doctorName: "", notes: "", isChronic: false });
  const [medicationForm, setMedicationForm] = useState({ medicineName: "", dosage: "", frequency: "", startDate: "", isOngoing: true, prescribedBy: "", notes: "" });
  const [familyForm, setFamilyForm] = useState({ relation: "", condition: "", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients/me/medical-history", { credentials: "include" });
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleAdd = async (kind: string, payload: any) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/patients/me/medical-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, data: payload }),
      });
      const d = await res.json();
      if (res.ok) {
        setShowForm(false);
        setAllergyForm({ allergen: "", type: "DRUG", severity: "MODERATE", reaction: "" });
        setConditionForm({ name: "", type: "CONDITION", diagnosedDate: "", hospital: "", doctorName: "", notes: "", isChronic: false });
        setMedicationForm({ medicineName: "", dosage: "", frequency: "", startDate: "", isOngoing: true, prescribedBy: "", notes: "" });
        setFamilyForm({ relation: "", condition: "", notes: "" });
        load();
      } else {
        setMessage(d.message || "Failed to add record");
      }
    } catch (err) {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, kind: string) => {
    if (!confirm("Remove this record?")) return;
    try {
      const res = await fetch(`/api/patients/me/medical-history?id=${id}&kind=${kind}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) load();
    } catch (err) {
      console.error(err);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "LIFE_THREATENING": return "bg-red-100 text-red-700 border-red-200";
      case "SEVERE": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MODERATE": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const tabs = [
    { k: "allergies", label: "Allergies", icon: AlertTriangle, count: data?.allergies?.length || 0 },
    { k: "conditions", label: "Conditions", icon: Heart, count: data?.conditions?.length || 0 },
    { k: "medications", label: "Medications", icon: Pill, count: data?.medications?.length || 0 },
    { k: "family", label: "Family", icon: Users, count: data?.familyHistory?.length || 0 },
  ];

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={26} /> Medical History
            </h1>
            <p className="text-sm text-slate-500 mt-1">Secure & verified health records</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all w-full sm:w-auto"
          >
            <Plus size={18} /> Add Record
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  isActive 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={20} className={isActive ? "mb-1.5 text-white" : "mb-1.5 text-slate-400"} />
                <span className="text-xs font-bold">{t.label}</span>
                {t.count > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          
          {tab === "allergies" && (
            !data?.allergies || data.allergies.length === 0 ? <EmptyState text="No allergies recorded." /> :
            data.allergies.map((a: any) => (
              <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-base">{a.allergen}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityColor(a.severity)}`}>
                      {a.severity.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{a.type}</p>
                  {a.reaction && (
                    <div className="bg-slate-50 rounded-lg p-2.5 text-sm text-slate-700 border border-slate-100">
                      <span className="font-semibold text-slate-500">Reaction:</span> {a.reaction}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(a.id, "ALLERGY")} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}

          {tab === "conditions" && (
            !data?.conditions || data.conditions.length === 0 ? <EmptyState text="No medical conditions recorded." /> :
            data.conditions.map((c: any) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-base">{c.name}</h3>
                    {c.isChronic && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Chronic</span>}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{c.type}</p>
                  <div className="space-y-1 text-sm text-slate-600">
                    {c.diagnosedDate && <p className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> Diagnosed: {new Date(c.diagnosedDate).toLocaleDateString()}</p>}
                    {c.hospital && <p className="flex items-center gap-1.5"><Activity size={14} className="text-slate-400"/> {c.hospital}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id, "CONDITION")} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}

          {tab === "medications" && (
            !data?.medications || data.medications.length === 0 ? <EmptyState text="No current medications." /> :
            data.medications.map((m: any) => (
              <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group">
                <div>
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    {m.medicineName} {m.dosage && <span className="text-sm font-medium text-slate-500">({m.dosage})</span>}
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-sm text-slate-700 border border-slate-100 inline-block">
                    {m.frequency || "As directed"}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    {m.startDate && <p>Started: {new Date(m.startDate).toLocaleDateString()}</p>}
                    {m.prescribedBy && <p>Prescribed by: {m.prescribedBy}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id, "MEDICATION")} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}

          {tab === "family" && (
            !data?.familyHistory || data.familyHistory.length === 0 ? <EmptyState text="No family history recorded." /> :
            data.familyHistory.map((f: any) => (
              <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group">
                <div>
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    {f.relation} <span className="text-slate-400 font-normal text-sm mx-1">•</span> {f.condition}
                  </h3>
                  {f.notes && <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">{f.notes}</p>}
                </div>
                <button onClick={() => handleDelete(f.id, "FAMILY")} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}

        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up sm:animate-none">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="font-bold text-lg text-slate-800">Add New {tab.charAt(0).toUpperCase() + tab.slice(1, -1)}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {tab === "allergies" && (
                <>
                  <input value={allergyForm.allergen} onChange={(e) => setAllergyForm({ ...allergyForm, allergen: e.target.value })} placeholder="Allergen name (e.g. Penicillin) *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={allergyForm.type} onChange={(e) => setAllergyForm({ ...allergyForm, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900">
                      {ALLERGY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900">
                      {SEVERITY.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <textarea value={allergyForm.reaction} onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })} rows={2} placeholder="Reaction (rash, swelling, etc.)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 resize-none" />
                  <button onClick={() => handleAdd("ALLERGY", allergyForm)} disabled={saving || !allergyForm.allergen} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Allergy"}
                  </button>
                </>
              )}

              {tab === "conditions" && (
                <>
                  <input value={conditionForm.name} onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })} placeholder="Condition name *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={conditionForm.type} onChange={(e) => setConditionForm({ ...conditionForm, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900">
                      {CONDITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={conditionForm.diagnosedDate} onChange={(e) => setConditionForm({ ...conditionForm, diagnosedDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900" />
                  </div>
                  <input value={conditionForm.hospital} onChange={(e) => setConditionForm({ ...conditionForm, hospital: e.target.value })} placeholder="Hospital (optional)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900" />
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={conditionForm.isChronic} onChange={(e) => setConditionForm({ ...conditionForm, isChronic: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-semibold text-slate-700">This is a chronic condition</span>
                  </label>
                  <button onClick={() => handleAdd("CONDITION", conditionForm)} disabled={saving || !conditionForm.name} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Condition"}
                  </button>
                </>
              )}

              {tab === "medications" && (
                <>
                  <input value={medicationForm.medicineName} onChange={(e) => setMedicationForm({ ...medicationForm, medicineName: e.target.value })} placeholder="Medicine name *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={medicationForm.dosage} onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })} placeholder="Dosage (500mg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900" />
                    <input value={medicationForm.frequency} onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })} placeholder="Frequency (1+0+1)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900" />
                  </div>
                  <input type="date" value={medicationForm.startDate} onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900" />
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={medicationForm.isOngoing} onChange={(e) => setMedicationForm({ ...medicationForm, isOngoing: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-semibold text-slate-700">Currently taking this medication</span>
                  </label>
                  <button onClick={() => handleAdd("MEDICATION", medicationForm)} disabled={saving || !medicationForm.medicineName} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Medication"}
                  </button>
                </>
              )}

              {tab === "family" && (
                <>
                  <input value={familyForm.relation} onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })} placeholder="Relation (Father, Mother, etc.) *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <input value={familyForm.condition} onChange={(e) => setFamilyForm({ ...familyForm, condition: e.target.value })} placeholder="Condition (Diabetes, etc.) *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <textarea value={familyForm.notes} onChange={(e) => setFamilyForm({ ...familyForm, notes: e.target.value })} rows={2} placeholder="Additional notes..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 resize-none" />
                  <button onClick={() => handleAdd("FAMILY", familyForm)} disabled={saving || !familyForm.relation || !familyForm.condition} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Family History"}
                  </button>
                </>
              )}

              {message && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg font-medium">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="text-slate-300" size={32} />
      </div>
      <p className="text-slate-500 font-medium">{text}</p>
    </div>
  );
}
