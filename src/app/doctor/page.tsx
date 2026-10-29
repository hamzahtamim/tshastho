"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User, Check, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [doctor, setDoctor] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("Hello");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor/my-appointments', { cache: 'no-store' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setDoctor(data.doctor);
        setAppointments(data.appointments || []);
        setError("");
      } else {
        setError(data.error || "Failed to load profile");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    const hour = new Date().getHours();
    let text = "Good Morning";
    if (hour >= 12 && hour < 17) text = "Good Afternoon";
    else if (hour >= 17 && hour < 21) text = "Good Evening";
    else if (hour >= 21 || hour < 5) text = "Good Night";
    setGreeting(text);

    loadData();
  }, [user, authLoading, router]);

  const updateStatus = async (appointmentId: string, status: string) => {
    await fetch('/api/doctor/appointments/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, status }),
    });
    loadData();
  };

  if (authLoading || loading) {
    return <div className="p-10 text-center text-slate-500">Loading doctor dashboard...</div>;
  }

  if (error || !doctor) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl mb-4 flex flex-col items-center">
          <AlertCircle size={40} className="mb-3" />
          <h2 className="font-bold text-lg mb-1">Profile Error</h2>
          <p className="text-sm">{error || "Doctor profile not found for this account."}</p>
          <p className="text-xs mt-2 text-red-500">Are you logged in with a Patient account instead?</p>
        </div>
      </div>
    );
  }

  const pending = appointments.filter(a => a.status === "REQUESTED");
  const confirmed = appointments.filter(a => a.status === "CONFIRMED");
  const completed = appointments.filter(a => a.status === "COMPLETED");
  const initial = doctor.user?.name?.charAt(0).toUpperCase() || "D";

  const doctorName = doctor.user?.name?.toLowerCase().startsWith('dr') || doctor.user?.name?.toLowerCase() === 'doctor' 
    ? doctor.user?.name 
    : `Dr. ${doctor.user?.name}`;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Profile Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-3xl p-6 mb-6 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-bold">{greeting}, {doctorName}!</h1>
            <p className="text-blue-100 text-sm">{doctor.specialty}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold">{pending.length}</p>
            <p className="text-[10px] text-blue-100 uppercase font-semibold">Requested</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold">{confirmed.length}</p>
            <p className="text-[10px] text-blue-100 uppercase font-semibold">Confirmed</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold">{completed.length}</p>
            <p className="text-[10px] text-blue-100 uppercase font-semibold">Completed</p>
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Recent Appointments</h2>
        <Link href="/doctor/appointments" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Calendar size={28} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-1">No appointments yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">When patients book an appointment, it will appear here.</p>
          <button onClick={loadData} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm">
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.slice(0, 5).map((apt) => (
            <div key={apt.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{apt.patient?.name || "Patient"}</h3>
                    <p className="text-xs text-slate-500">{apt.patient?.phone}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  apt.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                  apt.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {apt.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                <div className="flex items-center gap-1"><Calendar size={14} /> {new Date(apt.date).toLocaleDateString()}</div>
                <div className="flex items-center gap-1"><Clock size={14} /> {apt.time}</div>
              </div>

              {apt.status === "REQUESTED" && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => updateStatus(apt.id, "CONFIRMED")} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                    <Check size={14} /> Accept
                  </button>
                  <button onClick={() => updateStatus(apt.id, "REJECTED")} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
