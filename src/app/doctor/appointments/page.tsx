"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, User, CheckCircle, XCircle, Search, DollarSign, History, RefreshCw } from "lucide-react";

const TABS = [
  { k: "ALL", label: "All" },
  { k: "REQUESTED", label: "Requested" },
  { k: "CONFIRMED", label: "Confirmed" },
  { k: "COMPLETED", label: "Completed" },
  { k: "CANCELLED", label: "Cancelled" },
];

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("REQUESTED");
  const [search, setSearch] = useState("");
  
  // Reschedule State
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ id: "", date: "", time: "" });
  const [processingReschedule, setProcessingReschedule] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/doctor/my-appointments');
      const data = await res.json();
      if (data.success) setAppointments(data.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const updateStatus = async (appointmentId: string, status: string) => {
    try {
      await fetch('/api/doctor/appointments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status }),
      });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCollectCash = async (appointmentId: string) => {
    if (!confirm("Confirm you have received the cash payment?")) return;
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/collect-cash`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        alert("✅ Cash collected and added to your earnings!");
        fetchAppointments();
      } else {
        alert("Failed to mark as collected.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingReschedule(true);
    try {
      await fetch('/api/doctor/appointments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appointmentId: rescheduleData.id, 
          status: 'RESCHEDULED',
          newDate: rescheduleData.date,
          newTime: rescheduleData.time
        }),
      });
      setShowReschedule(false);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingReschedule(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "REQUESTED": return "bg-amber-100 text-amber-700";
      case "CONFIRMED": return "bg-blue-100 text-blue-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesFilter = filter === "ALL" || apt.status === filter;
    const matchesSearch = apt.patient?.name?.toLowerCase().includes(search.toLowerCase()) || apt.patient?.phone?.includes(search);
    return matchesFilter && matchesSearch;
  });

  const renderCard = (apt: any) => (
    <div key={apt.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="text-blue-600" size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900 truncate">
              {apt.patient?.name || "Patient"}
            </div>
            <div className="text-xs font-bold text-blue-700">{apt.patient?.phone}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${statusColor(apt.status)}`}>
          {apt.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-1.5">
          <Calendar size={12} className="text-slate-500" />
          <span className="font-semibold text-slate-800">{apt.date}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-1.5">
          <Clock size={12} className="text-slate-500" />
          <span className="font-semibold text-slate-800">{apt.time}</span>
        </div>
      </div>

      {apt.consultationFee && Number(apt.consultationFee) > 0 && (
        <div className="text-xs text-slate-600 mb-3">
          Fee: <span className="font-bold text-slate-800">৳ {Number(apt.consultationFee).toFixed(0)}</span>
        </div>
      )}

      {apt.symptoms && (
        <div className="text-xs text-slate-600 bg-amber-50 p-2 rounded-lg mb-3">
          <span className="font-medium">Symptoms:</span> {apt.symptoms}
        </div>
      )}

      {apt.consultationNotes && apt.status === "COMPLETED" && (
        <div className="text-xs text-slate-600 bg-green-50 p-2 rounded-lg mb-3">
          <span className="font-medium">Doctor's notes:</span> {apt.consultationNotes}
        </div>
      )}

      {/* Cash Button */}
      {apt.paymentStatus === "UNPAID" && (apt.status === "REQUESTED" || apt.status === "CONFIRMED") && (
        <div className="pt-3 border-t border-amber-100 mb-2">
          <button onClick={() => handleCollectCash(apt.id)} className="w-full flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition shadow-sm">
            <DollarSign size={16} /> Collect Cash (৳{Number(apt.consultationFee || 0).toFixed(0)})
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-2">
        {apt.status === "REQUESTED" && (
          <>
            <button onClick={() => updateStatus(apt.id, "CONFIRMED")} className="flex-1 min-w-[100px] flex items-center justify-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition">
              <CheckCircle size={14} /> Accept
            </button>
            <button onClick={() => updateStatus(apt.id, "REJECTED")} className="flex-1 min-w-[100px] flex items-center justify-center gap-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition">
              <XCircle size={14} /> Reject
            </button>
            <button onClick={() => { setRescheduleData({ id: apt.id, date: apt.date, time: apt.time }); setShowReschedule(true); }} className="flex-1 min-w-[100px] flex items-center justify-center gap-1 bg-purple-50 text-purple-600 border border-purple-200 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-100 transition">
              <RefreshCw size={14} /> Reschedule
            </button>
          </>
        )}

        {apt.status === "CONFIRMED" && (
          <>
            <button onClick={() => updateStatus(apt.id, "COMPLETED")} className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition">
              <CheckCircle size={14} /> Mark Completed
            </button>
            <button onClick={() => { setRescheduleData({ id: apt.id, date: apt.date, time: apt.time }); setShowReschedule(true); }} className="flex-1 flex items-center justify-center gap-1 bg-purple-50 text-purple-600 border border-purple-200 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-100 transition">
              <RefreshCw size={14} /> Reschedule
            </button>
          </>
        )}

        {apt.status === "COMPLETED" && (
          <Link href="/doctors" className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 transition">
            <History size={12} /> Book Again
          </Link>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="p-10 text-center text-slate-500">Loading appointments...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-slate-500 text-sm">Manage your patient bookings here.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search patient name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 mb-6 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              filter === tab.k 
                ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.k === "REQUESTED" && appointments.filter(a => a.status === "REQUESTED").length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] bg-red-500 text-white rounded-full">
                {appointments.filter(a => a.status === "REQUESTED").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {message && <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium text-center">{message}</div>}

      {filteredAppointments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-slate-800 font-bold text-xl mb-2">No appointments found</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            {search ? "No appointments match your search." : `You don't have any ${filter.toLowerCase()} appointments right now.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map(renderCard)}
        </div>
      )}

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Reschedule Appointment</h3>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">New Date</label>
                <input type="date" required value={rescheduleData.date} onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">New Time</label>
                <input type="time" required value={rescheduleData.time} onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowReschedule(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={processingReschedule} className="flex-1 py-3 text-white font-bold bg-purple-600 rounded-xl hover:bg-purple-700 transition disabled:opacity-50">
                  {processingReschedule ? "Saving..." : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
