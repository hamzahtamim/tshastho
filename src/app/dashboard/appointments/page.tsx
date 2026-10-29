"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  Calendar, Clock, User, CheckCircle, XCircle, RotateCcw,
  X, Stethoscope, AlertCircle, History
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
// PART2

  const statusColor = (s: string) => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-blue-100 text-blue-700";
      case "PATIENT_CONFIRMED": return "bg-indigo-100 text-indigo-700";
      case "RESCHEDULED": return "bg-purple-100 text-purple-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      case "NO_SHOW": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
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
    <div key={apt.id} className="bg-white p-4 rounded-2xl border border-slate-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Stethoscope className="text-blue-600" size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900 truncate">
              Dr. {apt.doctor?.user?.name || "Doctor"}
            </div>
            <div className="text-xs font-bold text-blue-700">{apt.doctor?.specialty}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${statusColor(apt.status)}`}>
          {apt.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-1.5">
          <Calendar size={12} className="text-slate-600" />
          <span className="font-semibold text-slate-800">{apt.date}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-1.5">
          <Clock size={12} className="text-slate-600" />
          <span className="font-semibold text-slate-800">{apt.time}</span>
        </div>
      </div>

      {apt.consultationFee && Number(apt.consultationFee) > 0 && (
        <div className="text-xs text-slate-800 mb-3">
          Fee: <span className="font-bold text-slate-800">৳ {Number(apt.consultationFee).toFixed(0)}</span>
        </div>
      )}

      {apt.symptoms && (
        <div className="text-xs text-slate-800 bg-amber-50 p-2 rounded-lg mb-3">
          <span className="font-medium">Symptoms:</span> {apt.symptoms}
        </div>
      )}

      {apt.consultationNotes && apt.status === "COMPLETED" && (
        <div className="text-xs text-slate-800 bg-green-50 p-2 rounded-lg mb-3">
          <span className="font-medium">Doctor's notes:</span> {apt.consultationNotes}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {apt.status === "CONFIRMED" && (
          <button onClick={() => openAction(apt, "PATIENT_CONFIRM")}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
            <CheckCircle size={12} /> Confirm
          </button>
        )}

        {["REQUESTED", "CONFIRMED", "PATIENT_CONFIRMED", "RESCHEDULED"].includes(apt.status) && (
          <>
            <button onClick={() => openAction(apt, "RESCHEDULE")}
              className="flex-1 bg-purple-50 text-purple-600 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
              <RotateCcw size={12} /> Reschedule
            </button>
            <button onClick={() => openAction(apt, "CANCEL")}
              className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
              <XCircle size={12} /> Cancel
            </button>
          </>
        )}

        {apt.status === "COMPLETED" && (
          <Link href="/doctors"
            className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1">
            <History size={12} /> Book Again
          </Link>
        )}
      </div>
    </div>
  );
// PART3

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-blue-600" size={22} />
          <h1 className="text-xl font-bold text-slate-800">My Appointments</h1>
        </div>
        <Link href="/doctors"
          className="text-sm text-blue-600 font-medium flex items-center gap-1">
          <Stethoscope size={14} /> Book New
        </Link>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
              tab === t.k ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-700 font-semibold p-8">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl">
          <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-700 font-semibold text-sm mb-3">No appointments</p>
          <Link href="/doctors"
            className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium">
            <Stethoscope size={14} /> Find a Doctor
          </Link>
        </div>
      ) : tab === "" && upcoming.length > 0 ? (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-slate-800 mb-2 mt-2">Upcoming</h2>
              <div className="space-y-3 mb-6">{upcoming.map(renderCard)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-slate-800 mb-2">Past</h2>
              <div className="space-y-3">{past.map(renderCard)}</div>
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">{appointments.map(renderCard)}</div>
      )}

      {/* Action Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="font-bold capitalize">{action.replace(/_/g, " ").toLowerCase()}</h2>
              <button onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl text-sm">
                <div className="font-medium">Dr. {selected.doctor?.user?.name}</div>
                <div className="text-xs text-slate-700 font-medium">{selected.date} • {selected.time}</div>
              </div>

              {action === "RESCHEDULE" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-800 mb-1 block">New Date *</label>
                    <input type="date" value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-800 mb-1 block">New Time *</label>
                    <input type="time" value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-800 mb-1 block">Reason</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                      rows={2} placeholder="Optional"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                  </div>
                </>
              )}

              {action === "CANCEL" && (
                <div>
                  <label className="text-xs font-medium text-slate-800 mb-1 block">Cancellation Reason</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    rows={3} placeholder="Please let us know why"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
              )}

              {action === "PATIENT_CONFIRM" && (
                <p className="text-sm text-slate-800">
                  Confirm that you'll attend this appointment on {selected.date} at {selected.time}.
                </p>
              )}

              {message && <p className="text-sm text-center text-blue-600">{message}</p>}

              <button onClick={handleAction} disabled={processing}
                className={`w-full py-3 rounded-xl font-medium disabled:opacity-50 ${
                  action === "CANCEL" ? "bg-red-600 text-white" :
                  action === "PATIENT_CONFIRM" ? "bg-green-600 text-white" :
                  "bg-blue-600 text-white"
                }`}>
                {processing ? "Processing..." : `Confirm ${action.replace(/_/g, " ").toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
