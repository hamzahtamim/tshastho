"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Phone, Clock, Star, User, Headset } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hotlineNumber, setHotlineNumber] = useState("01737326555");

  useEffect(() => {
    fetch('/api/settings/public').then(res => res.json()).then(data => { if(data.hotlineNumber) setHotlineNumber(data.hotlineNumber); });
    fetch('/api/doctors')
      .then(res => res.json())
      .then(data => {
        setDoctors(data.doctors || []);
        setFiltered(data.doctors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const filterList = doctors.filter(d =>
      d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(filterList);
  }, [search, doctors]);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading doctors...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">Tshastho</Link>
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              Login
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              onClick={() => router.push(`/doctors/${doc.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition cursor-pointer flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {doc.user?.avatarUrl ? (
                     <img src={doc.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                     <User size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 truncate">
                    Dr. {doc.user?.name}
                  </h2>
                  <p className="text-sm text-blue-600 font-medium">{doc.specialty}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      {Number(doc.averageRating || 0).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {doc.experience} yrs exp
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <p className="text-[10px] text-blue-700 mb-0.5">Consultation Fee</p>
                  <p className="text-sm font-bold text-blue-900">
                    ৳ {Number(doc.consultationFee || 0).toFixed(0)}
                  </p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="text-[10px] text-slate-500 mb-0.5">License</p>
                  <p className="text-xs font-mono text-slate-800 truncate">{doc.licenseNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.location.href = `tel:${doc.phone || '+8801700000000'}`; 
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition text-sm font-semibold"
                >
                  <Phone size={16} /> Call Now
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.location.href = `tel:${hotlineNumber}`; 
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition text-sm font-semibold"
                >
                  <Headset size={16} /> Hotline
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    router.push(`/doctors/book?id=${doc.id}`); 
                  }}
                  className="col-span-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition text-center shadow-sm"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
