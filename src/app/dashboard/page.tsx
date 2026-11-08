"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope, Pill, TestTube, Ambulance, Droplets, Home, Globe, 
  ClipboardCheck, Activity, Shield, Video, Syringe, Search, 
  DollarSign, Wallet, Calendar, Clock, FileText, ArrowRight
} from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const { branding } = useBranding();
  
  const [wallet, setWallet] = useState<any>(null);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [recentPrescription, setRecentPrescription] = useState<any>(null);

  
  // Auto-refresh data when user returns to the tab
  useEffect(() => {
    if (!user) return;
    const handleFocus = () => {
      fetch("/api/wallet/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setWallet(data.wallet);
        })
        .catch(console.error);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  useEffect(() => {
    if (user) {
      // Fetch Wallet
      fetch("/api/wallet/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setWallet(data.wallet);
        })
        .catch(console.error);

      // Fetch Upcoming Appointments (Logging for debugging)
      fetch("/api/appointments/list?status=CONFIRMED", { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          console.log("Appointments API Response:", data);
          if (data.success && data.appointments) {
            const today = new Date().toISOString().split('T')[0];
            const upcoming = data.appointments.filter((a: any) => a.date >= today);
            if (upcoming.length > 0) {
              setNextAppointment(upcoming[0]);
            }
          }
        }).catch(err => console.error("Appt Fetch Error:", err));

      // Fetch Recent Prescriptions (Logging for debugging)
      fetch("/api/prescriptions", { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          console.log("Prescriptions API Response:", data);
          if (data.prescriptions && data.prescriptions.length > 0) {
            setRecentPrescription(data.prescriptions[0]);
          }
        }).catch(err => console.error("Rx Fetch Error:", err));
    }
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    let greetText = "Good Morning";
    if (hour >= 12 && hour < 17) greetText = "Good Afternoon";
    else if (hour >= 17 && hour < 21) greetText = "Good Evening";
    else if (hour >= 21 || hour < 5) greetText = "Good Night";
    setGreeting(greetText);
  }, []);

  const userName = user?.name || "User";

  if (authLoading) return <div className="p-6 text-slate-500">Loading...</div>;

  const services = [
    { title: "Doctors", icon: Stethoscope, color: "bg-blue-50 text-blue-600", href: "/doctors" },
    { title: "Hospitals", icon: Home, color: "bg-green-50 text-green-600", href: "/hospitals" },
    { title: "Pharmacies", icon: Pill, color: "bg-purple-50 text-purple-600", href: "/medicines" },
    { title: "Diagnostics", icon: TestTube, color: "bg-orange-50 text-orange-600", href: "/diagnostics" },
    { title: "Ambulance", icon: Ambulance, color: "bg-red-50 text-red-600", href: "/ambulance" },
    { title: "Blood Bank", icon: Droplets, color: "bg-pink-50 text-pink-600", href: "/blood-bank" },
    { title: "Home Care", icon: Home, color: "bg-teal-50 text-teal-600", href: "/home-care" },
    { title: "International", icon: Globe, color: "bg-indigo-50 text-indigo-600", href: "/international" },
    { title: "Packages", icon: ClipboardCheck, color: "bg-cyan-50 text-cyan-600", href: "/packages" },
    { title: "Equipment", icon: Activity, color: "bg-amber-50 text-amber-600", href: "/equipment" },
    { title: "Insurance", icon: Shield, color: "bg-lime-50 text-lime-600", href: "/insurance" },
    { title: "Telemedicine", icon: Video, color: "bg-violet-50 text-violet-600", href: "/dashboard/telemedicine" },
    { title: "Prescriptions", icon: FileText, color: "bg-emerald-50 text-emerald-600", href: "/dashboard/prescriptions" },
    { title: "Vaccination", icon: Syringe, color: "bg-rose-50 text-rose-600", href: "/vaccination" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-2">
          <img 
            src={branding.logo || "/logo.png"} 
            alt="Tshastho" 
            className="h-8 md:h-9 w-auto object-contain" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML += '<span class="text-xl font-black text-blue-600 tracking-tighter">Tshastho</span>';
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors">
            <Search size={18} />
          </button>
          <Link href="/dashboard/profile" className="w-10 h-10 rounded-full border-2 border-blue-100 overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center text-blue-600 font-bold">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">
        {greeting}, <br className="sm:hidden" /> {userName}! 👋
      </h1>
      <p className="text-slate-500 text-sm font-medium mb-6">How can we help you today?</p>

      {/* ===== PREMIUM DASHBOARD WIDGETS ===== */}
      <div className="mb-6 space-y-4">
        {/* Next Appointment Widget */}
        {nextAppointment ? (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-blue-500/30 px-2 py-1 rounded-full border border-blue-400/30">Up Next</span>
                <h3 className="font-bold text-lg mt-2">{nextAppointment.doctor?.user?.name || 'Doctor'}</h3>
                <p className="text-blue-100 text-xs">{nextAppointment.doctor?.specialty || 'Specialist'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {nextAppointment.date}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {nextAppointment.time}</span>
                </div>
              </div>
              {nextAppointment.telemedicine && ['SCHEDULED', 'WAITING', 'ACTIVE'].includes(nextAppointment.telemedicine.status) && (
                <Link href={`/telemedicine/${nextAppointment.telemedicine.id}`} className="bg-white text-blue-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-50 transition">
                  <Video size={14} /> Join
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">No Upcoming Appointments</h3>
                <p className="text-slate-500 text-xs">Book a doctor to consult.</p>
              </div>
            </div>
            <Link href="/doctors" className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
              Book <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Recent Prescription Widget */}
        {recentPrescription ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Prescription</h3>
                <p className="text-slate-500 text-xs">{recentPrescription.doctorName || 'Doctor'} • {new Date(recentPrescription.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Link href="/dashboard/prescriptions" className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
              View <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">No Prescriptions Yet</h3>
                <p className="text-slate-500 text-xs">Your medical records will appear here.</p>
              </div>
            </div>
            <Link href="/dashboard/prescriptions" className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
              Upload <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
      {/* ===== END WIDGETS ===== */}

      {/* Quick Due Check */}
      <Link href="/dashboard/dues" className="block bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 mb-4 shadow-md hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Check My Dues</p>
              <p className="text-red-100 text-xs">View outstanding payments</p>
            </div>
          </div>
          <span className="text-white text-xl">›</span>
        </div>
      </Link>

      {/* Wallet Card */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 mb-4 shadow-md flex items-center justify-between">
        <Link href="/wallet" className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">My Wallet</p>
            <p className="text-white/80 text-xs">Available Balance: Tk {wallet ? Number(wallet.availableBalance).toFixed(2) : "0.00"}</p>
          </div>
        </Link>
        <Link href="/wallet/topup" className="text-white text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition">
          Top Up
        </Link>
      </div>


      {/* Health Records / Medical History Quick Access */}
      <Link href="/dashboard/medical-history" className="block bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 mb-4 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Health Records</p>
              <p className="text-emerald-50 text-xs mt-0.5">View your medical history & reports</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <ArrowRight size={16} className="text-white" />
          </div>
        </div>
      </Link>

      
      {/* Doctor Access / Privacy Card */}
      <Link href="/dashboard/consent" className="block bg-slate-800 rounded-2xl p-4 mb-4 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Doctor Access & Privacy</p>
              <p className="text-slate-300 text-xs mt-0.5">Manage who can view your health records</p>
            </div>
          </div>
          <div className="bg-white/10 p-2 rounded-full">
            <ArrowRight size={16} className="text-white" />
          </div>
        </div>
      </Link>

      {/* Dynamic Banner */}
      {branding.bannerHome && (
        <div className="mb-4 rounded-2xl overflow-hidden shadow-md">
          <img src={branding.bannerHome} alt="Banner" className="w-full object-cover" />
        </div>
      )}

      {/* Default Banner */}
      {!branding.bannerHome && (
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 mb-4 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">Your Health is Our Priority</h2>
            <p className="text-blue-100 text-xs mb-4">Get your health checkup package today!</p>
            <Link href="/packages" className="inline-block bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold">
              Explore Packages
            </Link>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute -right-12 -top-8 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-3 gap-3 gap-y-5 mb-6">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <Link key={index} href={service.href} className="flex flex-col items-center group">
              <div className={`w-16 h-16 rounded-2xl ${service.color} flex items-center justify-center mb-2 shadow-sm group-hover:shadow-md transition`}>
                <Icon size={26} />
              </div>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">{service.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Global Healthcare CTA */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <h3 className="font-bold mb-2">🌍 Global Healthcare</h3>
        <p className="text-slate-400 text-sm mb-3">Consult with top doctors from USA, UK, India & more.</p>
        <Link href="/international" className="inline-block bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold">
          Explore International
        </Link>
      </div>
    </div>
  );
}
