"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, Trash2, Save, Clock, CalendarX, X } from "lucide-react";

const DAYS = [
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
];

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"schedule" | "leaves">("schedule");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chambers, setChambers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [s, l, c] = await Promise.all([
        fetch('/api/doctor/schedule', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/doctor/leaves', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/doctor/chambers', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      ]);
      setSchedules(s.schedules || []);
      setLeaves(l.leaves || []);
      setChambers(c?.chambers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { if (user) load(); }, [user]);

  const addSlot = (dayOfWeek: string) => {
    setSchedules([...schedules, {
      dayOfWeek,
      startTime: "09:00",
      endTime: "13:00",
      slotDuration: 30,
      maxPatients: 10,
      slotType: "IN_PERSON",
      chamberAddress: "",
      consultationFee: 0,
    }]);
  };

  const removeSlot = (idx: number) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: string, value: any) => {
    setSchedules(schedules.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveSchedule = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch('/api/doctor/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schedules }),
      });
      if (res.ok) {
        setMessage("✅ Schedule saved successfully!");
        setTimeout(() => setMessage(""), 3000);
        load();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(`❌ ${errorData.message || errorData.error || 'Failed to save schedule.'}`);
      }
    } catch (err) {
      setMessage("❌ Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const addLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      setMessage("Please enter start and end dates");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/doctor/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(leaveForm),
      });
      if (res.ok) {
        setShowLeaveForm(false);
        setLeaveForm({ startDate: "", endDate: "", reason: "" });
        setMessage("✅ Leave added!");
        setTimeout(() => setMessage(""), 3000);
        load();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const removeLeave = async (id: string) => {
    if (!confirm("Remove this leave?")) return;
    await fetch(`/api/doctor/leaves?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const schedulesByDay = DAYS.map(d => ({
    ...d,
    slots: schedules.map((s, idx) => ({ ...s, _idx: idx })).filter(s => s.dayOfWeek === d.value)
  }));

  if (loading) return <div className="p-10 text-center text-slate-500">Loading schedule...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-[80vh] pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-blue-600" size={24} />
          Schedule & Availability
        </h1>
        <p className="text-slate-500 text-sm">Manage your weekly schedule and leave days.</p>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-xl mb-6 w-full max-w-sm">
        <button
          onClick={() => setTab("schedule")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${tab === "schedule" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
        >
          Weekly Schedule
        </button>
        <button
          onClick={() => setTab("leaves")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${tab === "leaves" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
        >
          Leave Days
        </button>
      </div>

      {message && <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium text-center">{message}</div>}

      {/* SCHEDULE TAB */}
      {tab === "schedule" && (
        <div className="space-y-6">
          {schedulesByDay.map((day) => (
            <div key={day.value} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{day.label}</h3>
                <button onClick={() => addSlot(day.value)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                  <Plus size={14} /> Add Slot
                </button>
              </div>
              
              <div className="p-5 space-y-4">
                {day.slots.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center italic py-2">No slots available on this day.</p>
                ) : (
                  day.slots.map((slot) => (
                    <div key={slot._idx} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 relative shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
                      <button onClick={() => removeSlot(slot._idx)} className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-blue-500" />
                        <span className="text-sm font-bold text-slate-800 tracking-wide">Time Slot</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Start</label>
                          <input type="time" value={slot.startTime} onChange={(e) => updateSlot(slot._idx, "startTime", e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">End</label>
                          <input type="time" value={slot.endTime} onChange={(e) => updateSlot(slot._idx, "endTime", e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Duration (min)</label>
                          <input type="number" value={slot.slotDuration} onChange={(e) => updateSlot(slot._idx, "slotDuration", Number(e.target.value))} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Max Patients</label>
                          <input type="number" value={slot.maxPatients} onChange={(e) => updateSlot(slot._idx, "maxPatients", Number(e.target.value))} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Type</label>
                          <select value={slot.slotType} onChange={(e) => updateSlot(slot._idx, "slotType", e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm">
                            <option value="IN_PERSON">In-Person</option>
                            <option value="ONLINE">Online</option>
                            <option value="BOTH">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Fee (৳)</label>
                          <input type="number" value={slot.consultationFee || 0} onChange={(e) => updateSlot(slot._idx, "consultationFee", Number(e.target.value))} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Chamber</label>
                          <select 
                            value={slot.chamberId || ""} 
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const selectedChamber = chambers.find(c => c.id === selectedId);
                              setSchedules(schedules.map((s, i) => i === slot._idx ? { 
                                ...s, 
                                chamberId: selectedId, 
                                chamberAddress: selectedChamber ? selectedChamber.name : "" 
                              } : s));
                            }} 
                            className="w-full p-3.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                          >
                            <option value="">-- Select Chamber --</option>
                            {chambers.map(c => (
                              <option key={c.id} value={c.id}>{c.name} {c.area ? `(${c.area})` : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEAVES TAB */}
      {tab === "leaves" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 text-lg">Upcoming Leaves</h2>
            <button onClick={() => setShowLeaveForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              <Plus size={16} /> Add Leave
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="text-center py-12">
              <CalendarX className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-500">No leaves scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave: any) => (
                <div key={leave.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{leave.reason || "No reason provided"}</p>
                  </div>
                  <button onClick={() => removeLeave(leave.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STICKY SAVE BUTTON */}
      {tab === "schedule" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-40">
          <div className="max-w-5xl mx-auto flex justify-end">
            <button onClick={saveSchedule} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-md">
              <Save size={18} /> {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </div>
      )}

      {/* LEAVE MODAL */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <button onClick={() => setShowLeaveForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Leave</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Optional)</label>
                <input value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Vacation" />
              </div>
              <button onClick={addLeave} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {saving ? "Adding..." : "Add Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
