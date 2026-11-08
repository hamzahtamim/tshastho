"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  Calendar, Clock, User, CheckCircle, XCircle, RotateCcw,
  X, Stethoscope, AlertCircle, History, Video, Plus
} from "lucide-react";

const TABS = [
  { k: "", label: "All" },
  { k: "REQUESTED", label: "Requested" },
  { k: "CONFIRMED", label: "Confirmed" },
  { k: "COMPLETED", label: "Completed" },
  { k: "CANCELLED", label: "Cancelled" },
];

export default function PatientAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<string>("");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const url = tab ? `/api/appointments/list?status=${tab}` : "/api/appointments/list";
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user, tab]);

  const openAction = (apt: any, actionType: string) => {
    setSelected(apt);
    setAction(actionType);
    setReason("");
    setNewDate(apt.date);
    setNewTime(apt.time);
    setMessage("");
  };

  const closeModal = () => { setSelected(null); setAction(""); setMessage(""); };

  const handleAction = async () => {
    if (!selected) return;
    setProcessing(true);
    setMessage("");

    const body: any = { action };
    if (reason) body.reason = reason;
    if (action === "RESCHEDULE") {
      body.newDate = newDate;
      body.newTime = newTime;
    }

    const res = await fetch(`/api/appointments/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setProcessing(false);

    if (res.ok) {
      setMessage("✅ Success!");
      setTimeout(() => { closeModal(); load(); }, 800);
    } else {
      setMessage(data.message || "Action failed");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-700 border-amber-200";
      case "CONFIRMED": return "bg-blue-100 text-blue-700 border-blue-200";
      case "PATIENT_CONFIRMED": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "RESCHEDULED": return "bg-purple-100 text-purple-700 border-purple-200";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const upcoming = appointments.filter(a => 
    !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status) && 
    new Date(a.date) >= new Date(new Date().toDateString())
  );
  
  const past = appointments.filter(a => 
    ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status) || 
    new Date(a.date) < new Date(new Date().toDateString())
  );

  const renderCard = (apt: any) => (
    <div key={apt.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Status Badge */}
      <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor(apt.status)}`}>
        {apt.status.replace(/_/g, " ")}
      </span>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
          <Stethoscope size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">
            Dr. {apt.doctor?.user?.name || "Doctor"}
          </h3>
          <p className="text-xs text-blue-600 font-medium">{apt.doctor?.specialty || "Specialist"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2 text-sm">
          <Calendar size={16} className="text-slate-400" />
          <span className="font-semibold text-slate-700">{apt.date}</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2 text-sm">
          <Clock size={16} className="text-slate-400" />
          <span className="font-semibold text-slate-700">{apt.time}</span>
        </div>
      </div>

      {apt.consultationFee > 0 && (
        <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
          Consultation Fee: <span className="font-bold text-slate-800">Tk {Number(apt.consultationFee).toFixed(0)}</span>
        </div>
      )}

      {apt.symptoms && (
        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mb-4 border border-slate-100">
          <span className="font-semibold text-slate-800 block mb-1">Symptoms:</span>
          {apt.symptoms}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
        {apt.telemedicine && ['SCHEDULED', 'WAITING', 'ACTIVE'].includes(apt.telemedicine.status) && (
          <Link href={`/telemedicine/${apt.telemedicine.id}`} className="flex-1 min-w-[120px] bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/20 transition-all">
            <Video size={14} /> Join Video Call
          </Link>
        )}
        
        {apt.status === "CONFIRMED" && (
          <button onClick={() => openAction(apt, "PATIENT_CONFIRM")} className="flex-1 min-w-[100px] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all">
            <CheckCircle size={14} /> Confirm
          </button>
        )}

        {["REQUESTED", "CONFIRMED", "PATIENT_CONFIRMED", "RESCHEDULED"].includes(apt.status) && (
          <>
            <button onClick={() => openAction(apt, "RESCHEDULE")} className="flex-1 min-w-[100px] bg-purple-50 text-purple-700 hover:bg-purple-100 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
              <RotateCcw size={14} /> Reschedule
            </button>
            <button onClick={() => openAction(apt, "CANCEL")} className="flex-1 min-w-[100px] bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
              <XCircle size={14} /> Cancel
            </button>
          </>
        )}

        {apt.status === "COMPLETED" && (
          <Link href="/doctors" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
            <History size={14} /> Book Again
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} /> My Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your health consultations</p>
        </div>
        <Link href="/doctors" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all">
          <Plus size={16} /> Book New
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map((t) => (
          <button 
            key={t.k} 
            onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.k 
                ? "bg-slate-800 text-white shadow-md" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No appointments found</h3>
          <p className="text-slate-500 text-sm mb-6">You don't have any appointments in this category.</p>
          <Link href="/doctors" className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all">
            <Stethoscope size={16} /> Find a Doctor
          </Link>
        </div>
      ) : tab === "" && upcoming.length > 0 ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h2>
            <div className="space-y-4">{upcoming.map(renderCard)}</div>
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Past</h2>
              <div className="space-y-4">{past.map(renderCard)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map(renderCard)}
        </div>
      )}

      {/* Premium Action Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up sm:animate-none">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="font-bold text-lg text-slate-800 capitalize">{action.replace(/_/g, " ").toLowerCase()}</h2>
              <button onClick={closeModal} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="font-bold text-slate-800">Dr. {selected.doctor?.user?.name}</div>
                <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                  <Calendar size={14} /> {selected.date} <Clock size={14} /> {selected.time}
                </div>
              </div>

              {action === "RESCHEDULE" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Date</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Time</label>
                    <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason (Optional)</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Why do you want to reschedule?" />
                  </div>
                </div>
              )}

              {action === "CANCEL" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cancellation Reason</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Please let us know why..." />
                </div>
              )}

              {action === "PATIENT_CONFIRM" && (
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-slate-600">Confirm that you'll attend this appointment on <b>{selected.date}</b> at <b>{selected.time}</b>.</p>
                </div>
              )}

              {message && <p className={`text-center text-sm font-medium p-3 rounded-lg ${message.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message}</p>}

              <button 
                onClick={handleAction} 
                disabled={processing} 
                className={`w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-lg ${
                  action === "CANCEL" ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : 
                  action === "PATIENT_CONFIRM" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : 
                  "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {processing ? "Processing..." : `Confirm ${action.replace(/_/g, " ").toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
