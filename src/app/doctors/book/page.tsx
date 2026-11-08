"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function BookingForm() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorId = searchParams.get("id");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const patientEmail = user?.email;

    if (!patientEmail) {
      setMessage("Please login first to book.");
      setLoading(false);
      return;
    }

    
    if (!doctorId) {
      setMessage("Doctor ID is missing from the URL. Please go back and select a doctor.");
      setLoading(false);
      return;
    }
    
    const res = await fetch("/api/appointments/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientEmail, doctorId, date, time }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Booking Successful! Redirecting...");
      setTimeout(() => router.push("/dashboard/appointments"), 1500);
    } else {
      setMessage(data.message || "Booking failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Book Appointment</h2>
        <p className="text-slate-500 text-sm mb-6">Select your preferred date and time</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl text-center">
            <p className="text-xs text-slate-500 mb-2">Voice Call Booking?</p>
            <a href="tel:01737326555" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm">
              <Phone size={16} /> Call 01737326555
            </a>
          </div>

          {message && <p className="text-center text-sm font-medium text-blue-600">{message}</p>}
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <BookingForm />
    </Suspense>
  );
}
