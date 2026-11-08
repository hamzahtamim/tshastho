"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, User, CheckCircle, XCircle, Search, 
  ChevronDown, FileText, Lock, ShieldCheck 
} from "lucide-react";

export default function PatientConsentPage() {
  const { user } = useAuth();
  const [consents, setConsents] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [scope, setScope] = useState("FULL_HISTORY");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchDoc, setSearchDoc] = useState("");

  const fetchData = async () => {
    try {
      const [consentRes, docRes] = await Promise.all([
        fetch("/api/patients/me/consents", { credentials: "include" }),
        fetch("/api/doctors?limit=50")
      ]);
      
      const consentData = await consentRes.json();
      const docData = await docRes.json();
      
      if (consentData.success) setConsents(consentData.consents);
      if (docData.success) setDoctors(docData.doctors || docData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleGrant = async () => {
    if (!selectedDoctorId) { setMessage("Please select a doctor"); return; }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/patients/me/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ doctorId: selectedDoctorId, scope })
      });
      if (res.ok) {
        setShowModal(false);
        setSelectedDoctorId("");
        fetchData();
      } else {
        const d = await res.json();
        setMessage(d.message || "Failed to grant access");
      }
    } catch (err) {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke access? The doctor will no longer be able to view your medical records.")) return;
    try {
      const res = await fetch(`/api/patients/me/consents?id=${id}&reason=Patient+revoked`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const activeConsents = consents.filter(c => c.status === "ACTIVE");
  const filteredDoctors = doctors.filter(d => 
    d.user?.name?.toLowerCase().includes(searchDoc.toLowerCase()) || 
    d.specialty?.toLowerCase().includes(searchDoc.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-3xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-blue-600" size={24} /> Doctor Access
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage who can view your health records</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          Grant Access
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-800 mb-6">
        <Lock size={20} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Your medical history is private. Only doctors you explicitly grant access to can view your records. You can revoke access at any time.
        </p>
      </div>

      {/* Active Consents List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Permissions</h2>
        
        {activeConsents.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-slate-300" size={32} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">No Active Permissions</h3>
            <p className="text-sm text-slate-500">You haven't granted any doctor access to your records yet.</p>
          </div>
        ) : (
          activeConsents.map((c: any) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Dr. {c.doctor?.user?.name || "Doctor"}</h3>
                  <p className="text-xs text-blue-600 font-medium mb-2">{c.doctor?.specialty || "Specialist"}</p>
                  
                  <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                      <CheckCircle size={12} /> Active
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                      Scope: {c.scope.replace(/_/g, " ")}
                    </span>
                    {c.expiresAt && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100">
                        Expires: {new Date(c.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleRevoke(c.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"
                title="Revoke Access"
              >
                <XCircle size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Grant Access Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800">Grant Record Access</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Doctor</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search doctor by name..." 
                    value={searchDoc}
                    onChange={(e) => setSearchDoc(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {filteredDoctors.length === 0 ? (
                    <p className="p-3 text-center text-sm text-slate-500">No doctors found</p>
                  ) : (
                    filteredDoctors.map((doc: any) => (
                      <label key={doc.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="radio" 
                          name="doctor" 
                          value={doc.id} 
                          checked={selectedDoctorId === doc.id}
                          onChange={() => setSelectedDoctorId(doc.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">Dr. {doc.user?.name}</p>
                          <p className="text-xs text-slate-500">{doc.specialty}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Access Scope</label>
                <select 
                  value={scope} 
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="FULL_HISTORY">Full Medical History</option>
                  <option value="PRESCRIPTIONS_ONLY">Prescriptions Only</option>
                  <option value="CURRENT_VISIT">Current Visit Only</option>
                  <option value="SPECIFIC_REPORTS">Specific Reports</option>
                </select>
              </div>

              {message && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg text-center">{message}</p>}

              <button 
                onClick={handleGrant} 
                disabled={saving || !selectedDoctorId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {saving ? "Granting..." : "Grant Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
