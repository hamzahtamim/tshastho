"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Star, Award, Briefcase, MapPin, Phone, Clock, MessageSquare, Calendar, CheckCircle, User, GraduationCap, Languages, Building2, X, Activity, Video, ShieldCheck } from "lucide-react";

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "CASH">("WALLET");
  const [slotFilter, setSlotFilter] = useState<"ALL" | "ONLINE" | "IN_PERSON">("ALL");
  const [consultMode, setConsultMode] = useState<"ONLINE" | "IN_PERSON">("IN_PERSON");
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [messaging, setMessaging] = useState(false);

  // Generate next 7 days
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: i === 0,
    };
  });

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/doctors/${doctorId}/reviews`);
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } catch (err) { console.error(err); }
  };

  const loadDoctor = async () => {
    setLoading(true);
    const res = await fetch(`/api/doctors?q=&limit=100`, { credentials: "include" });
    const data = await res.json();
    // find by id
    const found = (data.doctors || []).find((d: any) => d.id === doctorId);
    if (found) setDoctor(found);
    setLoading(false);
  };

  const loadSlots = async (date: string) => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    const res = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`);
    const data = await res.json();
    setSlots(data.slots || []);
    setSlotsLoading(false);
  };

  useEffect(() => {
    if (doctorId) {
      loadDoctor();
      const today = new Date().toISOString().slice(0, 10);
      setSelectedDate(today);
      loadSlots(today);
      fetchReviews();
    }
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate]);
// PART2

  
  
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      const data = await res.json();
      if (res.ok) {
        setShowReviewModal(false);
        setReviewComment("");
        fetchReviews();
        loadDoctor();
      } else {
        alert(data.error || "Failed to submit review");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      router.push(`/login?redirect=/doctors/${doctorId}`);
      return;
    }
    setMessaging(true);
    setMessage("");
    try {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // <--- CRUCIAL FIX
        body: JSON.stringify({ doctorId })
      });
      const data = await res.json();
      if (data.success && data.thread) {
        router.push(`/chat/${data.thread.id}`);
      } else {
        setMessage("Failed to start chat. Please try again.");
      }
    } catch (err) {
      setMessage("Network error occurred.");
    } finally {
      setMessaging(false);
    }
  };

  const handleBook = async () => {
    if (!user) {
      router.push(`/login?redirect=/doctors/${doctorId}`);
      return;
    }
    if (!selectedSlot) {
      setMessage("Please select a time slot");
      return;
    }
    setBooking(true);
    setMessage("");

    const res = await fetch("/api/appointments/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        doctorId,
        date: selectedDate,
        time: selectedSlot.startTime,
        slotType: selectedSlot.slotType,
        fee: selectedSlot.consultationFee || doctor?.consultationFee,
      }),
    });

    const data = await res.json();
    setBooking(false);
    if (res.ok) {
      setMessage("✅ Appointment requested! Check your dashboard.");
      setTimeout(() => router.push("/dashboard/appointments"), 1500);
    } else {
      setMessage(data.message || "Booking failed");
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;
  if (!doctor) return <div className="p-6 text-center text-slate-500">Doctor not found</div>;

  const avgRating = Number(doctor.averageRating || 0).toFixed(1);
// PART3

  return (
    <div className="min-h-screen bg-slate-50 pb-32">

      {/* Floating Message Button */}
      {!selectedSlot && (
        <div className="fixed bottom-6 right-6 z-40">
          <button 
            onClick={handleMessage} 
            disabled={messaging}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      )}
  
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800">Doctor Details</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Doctor Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              {doctor.user?.avatarUrl ? (
                <img src={doctor.user.avatarUrl} alt={doctor.user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="text-blue-600" size={36} />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">
                Dr. {doctor.user?.name || "Unknown"}
              </h2>
              <p className="text-sm text-blue-600 font-medium">{doctor.specialty}</p>
              {doctor.hospitalAffiliation && (
                <p className="text-xs text-slate-500 mt-0.5">{doctor.hospitalAffiliation}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="font-medium text-slate-700">{avgRating}</span>
                  <span>({doctor.totalReviews || 0})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase size={12} /> {doctor.experience} yr
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-blue-50 p-3 rounded-xl flex flex-col justify-center">
              <div className="text-[10px] text-blue-700 mb-1 uppercase tracking-wider font-semibold">
                {doctor.onlineFee || doctor.offlineFee ? "Consultation Fees" : "Consultation Fee"}
              </div>
              <div className="flex flex-col gap-1">
                {(doctor.onlineFee || doctor.offlineFee) ? (
                  <>
                    {doctor.onlineFee && <div className="text-sm font-bold text-blue-700">Online: ৳ {Number(doctor.onlineFee).toFixed(0)}</div>}
                    {doctor.offlineFee && <div className="text-sm font-bold text-blue-700">Offline: ৳ {Number(doctor.offlineFee).toFixed(0)}</div>}
                  </>
                ) : (
                  <div className="text-lg font-bold text-blue-700">৳ {Number(doctor.consultationFee || 0).toFixed(0)}</div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-[10px] text-slate-500 mb-1">License</div>
              <div className="text-sm font-mono text-slate-800 truncate">{doctor.licenseNumber}</div>
            </div>
          </div>

          {doctor.bio && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-600 mb-1">About</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2 text-sm">
            {doctor.chamberAddress && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>{doctor.chamberAddress}</span>
              </div>
            )}
            {doctor.bookingPhone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} /> {doctor.bookingPhone}
              </div>
            )}
            {doctor.languages && (
              <div className="flex items-center gap-2 text-slate-600">
                <Languages size={14} /> {doctor.languages}
              </div>
            )}
          </div>

          {/* Specialties */}
          {doctor.specialties?.length > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-3">
              <h3 className="text-xs font-bold text-slate-600 mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.specialties.map((s: any, i: number) => (
                  <span key={i} className={`px-2 py-1 rounded-full text-xs ${
                    s.isPrimary ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-700"
                  }`}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Qualifications */}
          {doctor.qualifications?.length > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-3">
              <h3 className="text-xs font-bold text-slate-600 mb-2">Qualifications</h3>
              <div className="space-y-1.5">
                {doctor.qualifications.map((q: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <GraduationCap size={14} className="mt-0.5 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{q.degree}</span>
                      {q.institution && <span className="text-slate-500"> — {q.institution}</span>}
                      {q.year && <span className="text-xs text-slate-400"> ({q.year})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        
      {/* Premium Features Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {doctor.emergencyAvailable && (
            <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-100">
              <Activity size={14} /> Emergency Available
            </span>
          )}
          {doctor.videoIntroUrl && (
            <a href={doctor.videoIntroUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-purple-100 hover:bg-purple-100 transition">
              <Video size={14} /> Watch Intro Video
            </a>
          )}
        </div>
        
        {doctor.services && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Services</h4>
            <div className="flex flex-wrap gap-1.5">
              {doctor.services.split(',').map((s: string, i: number) => (
                <span key={i} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">{s.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {doctor.insurances && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Accepted Insurances</h4>
            <div className="flex flex-wrap gap-1.5">
              {doctor.insurances.split(',').map((ins: string, i: number) => (
                <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-medium">
                  <ShieldCheck size={12} /> {ins.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Practice Locations (Chambers) */}
      {doctor.chambers && doctor.chambers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Building2 className="text-blue-600" size={18} />
            <h3 className="font-bold text-slate-800">Practice Locations</h3>
          </div>
          <div className="grid gap-3">
            {doctor.chambers.map((chamber: any) => (
              <div key={chamber.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    {chamber.name}
                    {chamber.isPrimary && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Primary</span>}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">{chamber.address}, {chamber.area} {chamber.city}</p>
                  {chamber.operatingHours && (
                    <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1"><Clock size={12}/> {chamber.operatingHours}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Section */}
      {doctor.experiences && doctor.experiences.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Briefcase className="text-blue-600" size={18} />
            <h3 className="font-bold text-slate-800">Experience</h3>
          </div>
          <div className="space-y-4">
            {doctor.experiences.map((exp: any) => (
              <div key={exp.id} className="flex gap-3">
                <div className="w-1 bg-blue-200 rounded-full mt-1 mb-1"></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{exp.designation}</h4>
                  <p className="text-xs text-slate-600">{exp.hospitalName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{exp.startYear} - {exp.isCurrent ? "Present" : exp.endYear}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards Section */}
      {doctor.awards && doctor.awards.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Award className="text-amber-500" size={18} />
            <h3 className="font-bold text-slate-800">Awards & Recognitions</h3>
          </div>
          <div className="space-y-3">
            {doctor.awards.map((award: any) => (
              <div key={award.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <Award size={14} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{award.title}</h4>
                  <p className="text-xs text-slate-600">{award.issuer} • {award.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memberships Section */}
      {doctor.memberships && doctor.memberships.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Building2 className="text-indigo-500" size={18} />
            <h3 className="font-bold text-slate-800">Memberships</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {doctor.memberships.map((mem: any) => (
              <div key={mem.id} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100 flex items-center gap-2">
                {mem.organization}
                {mem.role && <span className="text-xs text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-md">{mem.role}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Picker */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-600" size={18} />
            <h3 className="font-bold text-slate-800">Select Date</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {next7Days.map((d) => (
              <button key={d.date} onClick={() => setSelectedDate(d.date)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border min-w-[60px] ${
                  selectedDate === d.date
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-200 text-slate-700"
                }`}>
                <span className="text-[10px] uppercase">{d.day}</span>
                <span className="text-lg font-bold">{d.dayNum}</span>
                {d.isToday && <span className="text-[9px]">Today</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-blue-600" size={18} />
            <h3 className="font-bold text-slate-800">Available Slots</h3>
            
            <div className="flex bg-slate-100 p-1 rounded-lg ml-auto">
              {(["ALL", "ONLINE", "IN_PERSON"] as const).map(f => (
                <button key={f} onClick={() => setSlotFilter(f)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${slotFilter === f ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f === "ALL" ? "All" : f === "ONLINE" ? "Online" : "Offline"}
                </button>
              ))}
            </div>
  
          </div>

          {slotsLoading ? (
            <div className="text-center text-slate-500 py-6 text-sm">Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-center text-slate-500 py-6 text-sm">
              No slots available on this date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s, i) => {
                const selected = selectedSlot?.startTime === s.startTime;
                return (
                  <button key={i} onClick={() => s.isAvailable && setSelectedSlot(s)}
                    disabled={!s.isAvailable}
                    className={`py-2 px-1 rounded-xl border text-xs font-medium flex flex-col items-center ${
                      selected ? "bg-blue-600 text-white border-blue-600" :
                      s.isAvailable ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400" :
                      "bg-slate-100 border-slate-200 text-slate-400 line-through cursor-not-allowed"
                    }`}>
                    <span>{s.startTime}</span>
                  <div className="flex flex-col items-center gap-0.5 w-full truncate px-1">
                <span className={`text-[9px] font-extrabold ${selected ? "text-blue-100" : (s.slotType === 'ONLINE' ? "text-purple-600" : "text-emerald-600")}`}>
                  {s.slotType === 'ONLINE' ? '🎥 Online' : (s.slotType === 'BOTH' ? 'Online/Offline' : '🏥 In-Person')}
                </span>
                {s.slotType === 'IN_PERSON' && s.chamberName && (
                  <span className={`text-[8px] font-medium truncate w-full text-center ${selected ? "text-blue-200" : "text-slate-500"}`}>
                    {s.chamberName}
                  </span>
                )}
              </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm ${
            message.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            {message}
          </div>
        )}
      </div>

      
      {/* Reviews Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm mt-4 mb-8">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-600" size={18} />
            <h3 className="font-bold text-slate-800">Patient Reviews ({doctor.totalReviews || 0})</h3>
          </div>
          <button 
            onClick={() => setShowReviewModal(true)}
            className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition"
          >
            Write a Review
          </button>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-600 font-bold text-xs">
                      {review.patient?.avatarUrl ? (
                        <img src={review.patient.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        review.patient?.name?.charAt(0) || 'P'
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{review.patient?.name || 'Anonymous Patient'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={12} className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Rate Dr. {doctor.user?.name}</h3>
            
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button type="button" key={star} onClick={() => setReviewRating(star)} className="focus:outline-none">
                      <Star size={32} className={star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comment (Optional)</label>
                <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" 
                  placeholder="Share your experience..." />
              </div>
              <button type="submit" disabled={submittingReview} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Book Button */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-col">
              <p className="text-xs text-slate-500">
                {new Date(selectedDate).toLocaleDateString()} • {selectedSlot.startTime}
              </p>
              {selectedSlot.slotType !== 'ONLINE' && consultMode !== 'ONLINE' && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setPaymentMethod('WALLET')} className={`text-[10px] px-3 py-1.5 rounded-lg border-2 font-bold transition ${paymentMethod === 'WALLET' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Wallet</button>
                  <button type="button" onClick={() => setPaymentMethod('CASH')} className={`text-[10px] px-3 py-1.5 rounded-lg border-2 font-bold transition ${paymentMethod === 'CASH' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Cash at Chamber</button>
                </div>
              )}
            </div>
              <p className="text-lg font-bold text-slate-800">
                ৳ {Number(selectedSlot.consultationFee || doctor.consultationFee || 0).toFixed(0)}
              </p>
            </div>
            <button onClick={handleBook} disabled={booking}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 flex items-center gap-2">
              <CheckCircle size={16} /> {booking ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
