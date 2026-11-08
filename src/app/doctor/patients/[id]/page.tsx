"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, User, AlertTriangle, Heart, Pill, Users, Shield,
  Phone, Droplet, FileText, Clock, XCircle, Plus, X, Save, Activity
} from "lucide-react";

const ALLERGY_TYPES = ["DRUG", "FOOD", "ENVIRONMENTAL", "OTHER"];
const SEVERITY = ["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"];
const CONDITION_TYPES = ["CONDITION", "SURGERY", "HOSPITALIZATION", "PROCEDURE"];

export default function DoctorViewPatientPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [tab, setTab] = useState<"overview" | "allergies" | "conditions" | "medications" | "family" | "prescriptions">("overview");
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  
  const [allergyForm, setAllergyForm] = useState({ allergen: "", type: "DRUG", severity: "MODERATE", reaction: "" });
  const [conditionForm, setConditionForm] = useState({ name: "", type: "CONDITION", diagnosedDate: "", hospital: "", notes: "", isChronic: false });
  const [medicationForm, setMedicationForm] = useState({ medicineName: "", dosage: "", frequency: "", startDate: "", isOngoing: true, prescribedBy: "", notes: "" });
  const [familyForm, setFamilyForm] = useState({ relation: "", condition: "", notes: "" });

  useEffect(() => {
    if (user && params.id) {
      fetch(`/api/doctor/patients/${params.id}/history`, { credentials: "include" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) setError(d.message || "Access denied");
          else setData(d);
        })
        .catch(() => setError("Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [user, params.id]);

  const handleAddRecord = async (kind: string, payload: any) => {
    setSaving(true);
    setFormMessage("");
    try {
      const res = await fetch(`/api/doctor/patients/${params.id}/medical-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, data: payload }),
      });
      if (res.ok) {
        setShowForm(false);
        setAllergyForm({ allergen: "", type: "DRUG", severity: "MODERATE", reaction: "" });
        setConditionForm({ name: "", type: "CONDITION", diagnosedDate: "", hospital: "", notes: "", isChronic: false });
        setMedicationForm({ medicineName: "", dosage: "", frequency: "", startDate: "", isOngoing: true, prescribedBy: "", notes: "" });
        setFamilyForm({ relation: "", condition: "", notes: "" });
        
        const r = await fetch(`/api/doctor/patients/${params.id}/history`, { credentials: "include" });
        if (r.ok) { const d = await r.json(); setData(d); }
      } else {
        setFormMessage("Failed to add record");
      }
    } catch (err) {
      setFormMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "LIFE_THREATENING": return "bg-red-50 text-red-700 border-red-200";
      case "SEVERE": return "bg-orange-50 text-orange-700 border-orange-200";
      case "MODERATE": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="text-red-500" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={() => router.back()} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition">
          Go Back
        </button>
      </div>
    </div>
  );

  if (!data) return null;
  const { patient, allergies, conditions, medications, familyHistory, pastPrescriptions } = data;

  const tabs = [
    { k: "overview", label: "Overview", icon: User },
    { k: "allergies", label: `Allergies (${allergies.length})`, icon: AlertTriangle },
    { k: "conditions", label: `Conditions (${conditions.length})`, icon: Heart },
    { k: "medications", label: `Medications (${medications.length})`, icon: Pill },
    { k: "family", label: `Family (${familyHistory.length})`, icon: Users },
    { k: "prescriptions", label: `Rx History (${pastPrescriptions.length})`, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-700 to-cyan-600 pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-md"></div>
        <div className="max-w-4xl mx-auto relative z-10 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/30 transition">
            <ArrowLeft size={20} />
          </button>
          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
            <Shield size={14} /> Access Granted
          </span>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex items-center gap-5">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm overflow-hidden">
            {patient.avatarUrl ? (
              <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover" />
            ) : (
              patient.name?.charAt(0).toUpperCase() || 'P'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600 font-medium">
              {patient.patientProfile?.bloodGroup && (
                <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-md">
                  <Droplet size={14} /> {patient.patientProfile.bloodGroup}
                </span>
              )}
              {patient.phone && (
                <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                  <Phone size={14} /> {patient.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Add Button */}
        {['allergies', 'conditions', 'medications', 'family'].includes(tab) && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} /> Add Record
            </button>
          </div>
        )}

        {/* Lists */}
        <div className="space-y-4">
          
          {tab === "allergies" && (
            allergies.length === 0 ? <EmptyState icon={AlertTriangle} text="No allergies recorded." /> :
            allergies.map((a: any) => (
              <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{a.allergen}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityColor(a.severity)}`}>
                      {a.severity.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 tracking-wider mb-3">{a.type}</p>
                  {a.reaction && (
                    <div className="bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-slate-100 inline-block">
                      <span className="font-semibold text-slate-500">Reaction:</span> {a.reaction}
                    </div>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
              </div>
            ))
          )}

          {tab === "conditions" && (
            conditions.length === 0 ? <EmptyState icon={Heart} text="No conditions recorded." /> :
            conditions.map((c: any) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{c.name}</h3>
                    {c.isChronic && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">Chronic</span>}
                  </div>
                  <p className="text-xs font-bold text-slate-400 tracking-wider mb-3">{c.type}</p>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    {c.diagnosedDate && <p className="flex items-center gap-2"><Clock size={14} className="text-slate-400"/> Diagnosed: {new Date(c.diagnosedDate).toLocaleDateString()}</p>}
                    {c.hospital && <p className="flex items-center gap-2"><Activity size={14} className="text-slate-400"/> {c.hospital}</p>}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
                  <Heart size={20} />
                </div>
              </div>
            ))
          )}

          {tab === "medications" && (
            medications.length === 0 ? <EmptyState icon={Pill} text="No active medications." /> :
            medications.map((m: any) => (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">
                    {m.medicineName} {m.dosage && <span className="text-sm font-medium text-slate-500">({m.dosage})</span>}
                  </h3>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold inline-block mb-3">
                    {m.frequency || "As directed"}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {m.startDate && <span>Started: {new Date(m.startDate).toLocaleDateString()}</span>}
                    {m.prescribedBy && <span className="ml-3">By: {m.prescribedBy}</span>}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Pill size={20} />
                </div>
              </div>
            ))
          )}

          {tab === "family" && (
            familyHistory.length === 0 ? <EmptyState icon={Users} text="No family history recorded." /> :
            familyHistory.map((f: any) => (
              <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {f.relation} <span className="text-slate-300 mx-1">•</span> {f.condition}
                  </h3>
                  {f.notes && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{f.notes}</p>}
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
            ))
          )}

          {tab === "overview" && (
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies</p>
                  <p className="text-3xl font-bold text-slate-900">{allergies.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conditions</p>
                  <p className="text-3xl font-bold text-slate-900">{conditions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medications</p>
                  <p className="text-3xl font-bold text-slate-900">{medications.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Past Rx</p>
                  <p className="text-3xl font-bold text-slate-900">{pastPrescriptions.length}</p>
                </div>
             </div>
          )}
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white shrink-0">
              <h2 className="font-bold text-lg text-slate-900">Add {tab.charAt(0).toUpperCase() + tab.slice(1, -1)}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 space-y-4">
              {tab === "allergies" && (
                <>
                  <input value={allergyForm.allergen} onChange={(e) => setAllergyForm({ ...allergyForm, allergen: e.target.value })} placeholder="Allergen name *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={allergyForm.type} onChange={(e) => setAllergyForm({ ...allergyForm, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900">
                      {ALLERGY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900">
                      {SEVERITY.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <textarea value={allergyForm.reaction} onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })} rows={2} placeholder="Reaction (rash, swelling, etc.)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 resize-none" />
                  <button onClick={() => handleAddRecord("ALLERGY", allergyForm)} disabled={saving || !allergyForm.allergen} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
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
                  <button onClick={() => handleAddRecord("CONDITION", conditionForm)} disabled={saving || !conditionForm.name} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
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
                  <button onClick={() => handleAddRecord("MEDICATION", medicationForm)} disabled={saving || !medicationForm.medicineName} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Medication"}
                  </button>
                </>
              )}

              {tab === "family" && (
                <>
                  <input value={familyForm.relation} onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })} placeholder="Relation (Father, Mother, etc.) *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <input value={familyForm.condition} onChange={(e) => setFamilyForm({ ...familyForm, condition: e.target.value })} placeholder="Condition (Diabetes, etc.) *" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900" />
                  <textarea value={familyForm.notes} onChange={(e) => setFamilyForm({ ...familyForm, notes: e.target.value })} rows={2} placeholder="Additional notes..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900 resize-none" />
                  <button onClick={() => handleAddRecord("FAMILY", familyForm)} disabled={saving || !familyForm.relation || !familyForm.condition} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                    {saving ? "Saving..." : "Add Family History"}
                  </button>
                </>
              )}

              {formMessage && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg font-medium">{formMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="text-slate-300" size={40} />
      </div>
      <p className="text-slate-500 font-medium">{text}</p>
    </div>
  );
}
