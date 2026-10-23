"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import dynamic from "next/dynamic";
import { MapPin, Clock, CheckCircle, Camera, AlertTriangle, User } from "lucide-react";
import { getCurrentPosition, haversineMeters } from "@/lib/attendance/gps";

const SelfieCapture = dynamic(() => import("@/components/attendance/SelfieCapture"), { ssr: false });

export default function StaffAttendancePage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [chambers, setChambers] = useState<any[]>([]);
  const [selectedChamberId, setSelectedChamberId] = useState("");
  const [rule, setRule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gps, setGps] = useState<any>(null);
  const [gpsError, setGpsError] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [showCamera, setShowCamera] = useState<null | "CHECK_IN" | "CHECK_OUT">(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/staff/self", { credentials: "include" });
    const data = await res.json();
    if (!data.staff) { setLoading(false); return; }
    setStaff(data.staff);
    setToday(data.todayAttendance);

    const chambersList = data.staff.chamberAssignments?.map((ca: any) => ca.chamber).filter(Boolean) || [];
    setChambers(chambersList);
    if (chambersList.length > 0) setSelectedChamberId(chambersList[0].id);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!selectedChamberId) return;
    fetch(`/api/doctor/attendance-rules?chamberId=${selectedChamberId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setRule((d.rules || [])[0] || null))
      .catch(() => {});
  }, [selectedChamberId]);

  const captureGps = async () => {
    setGpsError("");
    try {
      const pos = await getCurrentPosition();
      setGps(pos);

      const chamber = chambers.find((c: any) => c.id === selectedChamberId);
      if (chamber?.gpsLatitude && chamber?.gpsLongitude) {
        const d = haversineMeters(
          Number(chamber.gpsLatitude),
          Number(chamber.gpsLongitude),
          pos.latitude,
          pos.longitude
        );
        setDistance(d);
      }
      return pos;
    } catch (err) {
      setGpsError(err.message);
      return null;
    }
  };

  useEffect(() => {
    captureGps();
  }, [selectedChamberId]);

  const handleSelfieCapture = async (blob: Blob) => {
    const action = showCamera;
    if (!action) return;

    setProcessing(true);
    setMessage("");

    try {
      // Upload selfie
      const fd = new FormData();
      fd.append("file", blob, "selfie.jpg");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error("Upload failed");
      }

      // Get GPS (retry if needed)
      let pos = gps;
      if (!pos) pos = await captureGps();
      if (!pos) throw new Error("GPS required. Please allow location access.");

      const res = await fetch("/api/doctor/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          staffId: staff.id,
          chamberId: selectedChamberId || undefined,
          selfieUrl: uploadData.url,
          latitude: pos.latitude,
          longitude: pos.longitude,
          device: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ " + (action === "CHECK_IN" ? "Checked in!" : "Checked out!"));
        setShowCamera(null);
        load();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.message || "Failed");
      }
    } catch (err) {
      setMessage(err.message || "Failed");
    }
    setProcessing(false);
  };

  const startAction = (action: "CHECK_IN" | "CHECK_OUT") => {
    if (rule?.requireGps && !gps) {
      setMessage("📍 Location required. Please enable GPS.");
      return;
    }
    if (rule?.requireGps && distance !== null && rule?.radiusMeters && distance > rule.radiusMeters) {
      setMessage(`⚠️ You are ${distance}m away. Max allowed: ${rule.radiusMeters}m`);
      return;
    }
    setShowCamera(action);
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;
  if (!staff) return <div className="p-6 text-center text-slate-500">Not a staff member</div>;

  const isCheckedIn = today && !today.checkOutAt;

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="text-blue-600" size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">{staff.user?.name}</h1>
          <p className="text-xs text-slate-500">{staff.role}</p>
        </div>
      </div>

      {/* Chamber Selector */}
      {chambers.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Chamber</label>
          <select value={selectedChamberId} onChange={(e) => setSelectedChamberId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
            {chambers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* GPS Status */}
      <div className={`rounded-2xl p-3 mb-3 border ${
        gps ? "bg-green-50 border-green-200" : gpsError ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
      }`}>
        <div className="flex items-center gap-2 text-xs">
          <MapPin size={14} className={gps ? "text-green-600" : "text-slate-400"} />
          {gps ? (
            <div>
              <span className="text-green-700 font-medium">Location captured</span>
              {distance !== null && (
                <span className="text-slate-500 ml-2">• {distance}m from chamber</span>
              )}
            </div>
          ) : gpsError ? (
            <span className="text-red-600">{gpsError}</span>
          ) : (
            <span className="text-slate-500">Getting location...</span>
          )}
        </div>
        {rule && (
          <div className="text-[10px] text-slate-500 mt-1">
            Rule: {rule.radiusMeters}m radius • Start: {rule.workingHoursStart} • Grace: {rule.lateGraceMinutes}min
          </div>
        )}
      </div>

      {/* Today Status */}
      {today ? (
        <div className={`rounded-2xl p-5 mb-4 border-2 ${isCheckedIn ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200"}`}>
          <div className="text-center mb-3">
            <div className="text-xs text-slate-500 mb-1">Today's Status</div>
            <div className={`text-2xl font-bold ${isCheckedIn ? "text-green-700" : "text-slate-700"}`}>
              {isCheckedIn ? "Checked In" : "Complete"}
            </div>
            {today.isLate && (
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                <AlertTriangle size={10} /> Late by {today.lateMinutes}min
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 p-2 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">Check In</div>
              <div className="font-bold text-slate-800">
                {new Date(today.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div className="bg-white/60 p-2 rounded-lg text-center">
              <div className="text-[10px] text-slate-500">Check Out</div>
              <div className="font-bold text-slate-800">
                {today.checkOutAt ? new Date(today.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4 text-center">
          <Clock className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-sm text-slate-500">Not checked in yet</p>
        </div>
      )}

      {message && (
        <div className="mb-3 p-3 rounded-xl text-sm text-center bg-blue-50 text-blue-700">
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isCheckedIn && (
          <button onClick={() => startAction("CHECK_IN")} disabled={processing}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            <Camera size={18} /> Check In with Selfie
          </button>
        )}
        {isCheckedIn && (
          <button onClick={() => startAction("CHECK_OUT")} disabled={processing}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            <Camera size={18} /> Check Out with Selfie
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 text-[10px] text-slate-400 text-center">
        Your selfie and location will be recorded for attendance verification.
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <SelfieCapture
          onCapture={handleSelfieCapture}
          onClose={() => setShowCamera(null)}
        />
      )}
    </div>
  );
}
