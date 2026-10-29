"use client";

import { useEffect, useState } from "react";
import { Users, Search, Phone, Calendar, ArrowRight, Share2, CheckCircle } from "lucide-react";

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/doctor/patients')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPatients(data.patients);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleShare = () => {
    // Copy the doctor's public profile link
    navigator.clipboard.writeText(window.location.origin + '/doctors');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filtered = patients.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.phone?.includes(search)
  );

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading patients...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Patients</h1>
          <p className="text-slate-500 text-sm">View and manage all your registered patients.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white mb-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Patients</p>
            <h2 className="text-3xl font-bold">{patients.length}</h2>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
            <Users size={40} />
          </div>
          <h3 className="text-slate-800 font-bold text-2xl mb-2">
            {search ? "No patients match your search" : "No patients yet"}
          </h3>
          <p className="text-slate-500 text-sm mb-8 max-w-md">
            {search 
              ? "Try searching with a different name or phone number."
              : "You haven't received any patients yet. Share your profile link to start getting appointments."}
          </p>
          
          {!search && (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md"
              >
                {copied ? <CheckCircle size={18} /> : <Share2 size={18} />}
                {copied ? "Link Copied!" : "Share Profile Link"}
              </button>
              <a 
                href="/doctor"
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition"
              >
                Dashboard
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient) => (
            <div key={patient.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xl font-bold border-2 border-white shadow-sm">
                  {patient.name?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition">{patient.name || 'Unknown Patient'}</h3>
                  <p className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                    ID: {patient.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={16} className="text-blue-500" />
                  <span>{patient.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar size={16} className="text-blue-500" />
                  <span>Joined {new Date(patient.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <button className="w-full py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-blue-600 transition flex items-center justify-center gap-2">
                View History <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
