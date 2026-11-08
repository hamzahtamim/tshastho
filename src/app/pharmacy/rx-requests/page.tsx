"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { 
  ArrowLeft, FileText, CheckCircle, XCircle, User, Pill, Eye, X, ShoppingCart, 
  Printer, Calendar, Clock, AlertTriangle, ArrowRight
} from "lucide-react";

export default function PharmacyRxRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  
  // Modal State
  const [selected, setSelected] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacy/rx-requests?status=${filter}`, { credentials: "include" });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user, filter]);

  const handleAction = async (id: string, action: string) => {
    if (action === "REJECT" && !rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    
    const res = await fetch(`/api/pharmacy/rx-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, rejectionReason: rejectReason }),
    });
    
    setProcessing(false);
    if (res.ok) {
      setSelected(null);
      setRejectReason("");
      load();
    } else {
      alert("Failed to process request.");
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "ACCEPTED": return "bg-blue-100 text-blue-700 border-blue-200";
      case "CONVERTED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const TABS = ["PENDING", "ACCEPTED", "CONVERTED", "REJECTED"];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Rx Requests</h1>
              <p className="text-xs text-slate-500">Manage incoming patient prescriptions</p>
            </div>
          </div>

          {/* Premium Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">
            {TABS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                  filter === s 
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm mt-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No {filter.toLowerCase()} requests</h3>
            <p className="text-slate-500 text-sm">When patients send prescriptions, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((r) => (
              <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                      {r.patient?.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{r.patient?.name || "Unknown Patient"}</div>
                      <div className="text-xs text-slate-500">{r.patient?.phone || r.patient?.email}</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(r.status)}`}>
                    {r.status}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-4 flex-1 border border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-mono font-semibold">{r.requestNumber}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5 mt-2">
                    <Pill size={14} className="text-blue-500"/> 
                    {r.prescription?.items?.length || 0} Medicines requested
                  </div>
                </div>

                <button 
                  onClick={() => { setSelected(r); setRejectReason(""); }}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye size={16} /> Review Request
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:animate-none">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Rx Request Details</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selected.requestNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-full hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              
              {/* Patient Info */}
              <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <User className="text-blue-600" size={20} />
                  <div>
                    <div className="font-bold text-slate-800">{selected.patient?.name}</div>
                    <div className="text-xs text-slate-600">{selected.patient?.phone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Date</div>
                  <div className="text-sm font-medium">{new Date(selected.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Prescription Preview (Read-Only) */}
              {selected.prescription && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600"/> Prescribed Medicines
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{selected.prescription.prescriptionNo}</div>
                  </div>
                  
                  <div className="p-4 bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="pb-2">Medicine</th>
                          <th className="pb-2">Dosage</th>
                          <th className="pb-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selected.prescription.items?.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-3 pr-2">
                              <div className="font-bold text-slate-800">{item.medicineName}</div>
                              <div className="text-[10px] text-slate-500">{item.strength} {item.dosageForm}</div>
                            </td>
                            <td className="py-3 pr-2 text-slate-600 text-xs">
                              {item.frequency} <br/> <span className="text-[10px]">{item.duration}</span>
                            </td>
                            <td className="py-3 text-right font-medium text-slate-800">
                              {item.quantity || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Prescription Notes / Diagnosis */}
                  {(selected.prescription.diagnosis || selected.prescription.advice) && (
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs">
                      {selected.prescription.diagnosis && <p className="mb-1"><span className="font-bold text-slate-700">Diagnosis:</span> <span className="text-slate-600">{selected.prescription.diagnosis}</span></p>}
                      {selected.prescription.advice && <p><span className="font-bold text-slate-700">Advice:</span> <span className="text-slate-600">{selected.prescription.advice}</span></p>}
                    </div>
                  )}
                </div>
              )}

              {/* Action Area */}
              <div className="pt-2">
                {selected.status === "PENDING" && (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <label className="text-xs font-bold text-red-800 mb-2 block flex items-center gap-1">
                        <AlertTriangle size={14}/> Rejection Reason (Only required if rejecting)
                      </label>
                      <textarea 
                        value={rejectReason} 
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2} 
                        placeholder="e.g. Out of stock, invalid prescription..." 
                        className="w-full px-4 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleAction(selected.id, "REJECT")} 
                        disabled={processing}
                        className="w-full bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                      <button 
                        onClick={() => handleAction(selected.id, "ACCEPT")} 
                        disabled={processing}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} /> Accept
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === "ACCEPTED" && (
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 text-center">
                    <CheckCircle className="mx-auto text-blue-500 mb-2" size={32}/>
                    <h3 className="font-bold text-blue-900 mb-1">Prescription Accepted</h3>
                    <p className="text-xs text-blue-700 mb-4">You have accepted this prescription. Create a sale to proceed.</p>
                    <Link 
                      href={`/pharmacy/pos?patientId=${selected.patient?.id}&prescriptionId=${selected.prescription?.id}`}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} /> Create Sale in POS
                    </Link>
                  </div>
                )}

                {selected.status === "REJECTED" && (
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-200">
                    <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                      <XCircle size={18}/> Request Rejected
                    </div>
                    <p className="text-sm text-red-700">Reason: {selected.rejectionReason || "No reason provided."}</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
