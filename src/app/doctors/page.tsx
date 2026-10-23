"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Search, Briefcase, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/doctors")
      .then(res => res.json())
      .then(data => {
        setDoctors(data.doctors || []);
        setFiltered(data.doctors || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const filteredList = doctors.filter(d =>
      d.user.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(filteredList);
  }, [search, doctors]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">Tshastho</Link>
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
              Login
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Our Doctors</h1>
        <p className="text-slate-500 mb-6">Consult with top specialists from around the world</p>

        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or specialty..." className="pl-10" />
        </div>

        {loading ? <p className="text-slate-500">Loading doctors...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc) => (
              <Link key={doc.id} href={`/doctors/${doc.id}`} className="block bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-blue-200 transition cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
                    {doc.user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{doc.user.name}</h3>
                    <p className="text-sm text-blue-600">{doc.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Briefcase size={14} /> {doc.experience} yrs</span>
                  <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" fill="currentColor" /> 4.8</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <span className="text-lg font-bold text-slate-800">৳{doc.consultationFee}</span>
                  <div className="flex gap-2">
                    <a href="tel:01737326555" className="p-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50" title="Call to Book">
                      <Phone size={18} />
                    </a>
                    <Link href={`/doctors/book?id=${doc.id}`}>
                      <Button size="sm">Book Now</Button>
                    </Link>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-500 py-12">No doctors found.</p>
        )}
      </div>
    </div>
  );
}
