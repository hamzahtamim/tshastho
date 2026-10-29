"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Calendar, Video, MessageSquare, MapPin, Users, FilePlus, FileText, Award, UserPlus, Clock, Building, UserCheck, ShieldAlert, Footprints, DollarSign, CreditCard, QrCode, User, Menu, X, LogOut, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<string>("PENDING");

  const mainLinks = [
    { name: "Dashboard", href: "/doctor", icon: LayoutDashboard },
    { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { name: "Patients", href: "/doctor/patients", icon: Users },
    { name: "Messages", href: "/doctor/chat", icon: MessageSquare },
  ];

  const menuCategories = [
    {
      title: "Clinical",
      links: [
        { name: "Telemedicine", href: "/doctor/telemedicine", icon: Video },
        { name: "Local Practice", href: "/doctor/local-practice", icon: MapPin },
        { name: "New Prescription", href: "/doctor/prescriptions/new", icon: FilePlus },
        { name: "Online Rx", href: "/doctor/prescriptions", icon: FileText },
        { name: "Rx Templates", href: "/doctor/prescription-templates", icon: FileText },
      ]
    },
    {
      title: "Practice Management",
      links: [
        { name: "Chambers", href: "/doctor/chambers", icon: Building },
        { name: "Schedule", href: "/doctor/schedule", icon: Calendar },
        { name: "Staff", href: "/doctor/staff", icon: UserCheck },
        { name: "Attendance", href: "/doctor/staff-attendance", icon: UserCheck },
        { name: "Attendance Rules", href: "/doctor/attendance-rules", icon: ShieldAlert },
        { name: "Walk-in Earnings", href: "/doctor/walk-in-earnings", icon: Footprints },
      ]
    },
    {
      title: "Finance & Settings",
      links: [
        { name: "Earnings", href: "/doctor/earnings", icon: DollarSign },
        { name: "Payouts", href: "/doctor/payouts", icon: CreditCard },
        { name: "Referrals", href: "/doctor/referrals", icon: UserPlus },
        { name: "Certificates", href: "/doctor/certificates", icon: Award },
        { name: "Follow-ups", href: "/doctor/follow-ups", icon: Clock },
        { name: "My Code", href: "/doctor/referral", icon: QrCode },
        { name: "Profile & KYC", href: "/doctor/profile", icon: User },
      ]
    }
  ];

  const isStaff = user?.role === 'DOCTOR_STAFF';
  const perms = (user?.permissions as any) || {};

  const filteredMainLinks = mainLinks.filter((link: any) => {
    if (!isStaff) return true;
    if (link.name === 'Appointments') return perms.canViewAppointments !== false;
    if (link.name === 'Patients') return perms.canViewPatients === true;
    return true;
  });

  const filteredMenuCategories = menuCategories.map((cat: any) => {
    if (!isStaff) return cat;
    if (cat.title === 'Finance & Settings') return null;
    if (cat.title === 'Practice Management') return null;

    if (cat.title === 'Clinical') {
       if (isStaff) return { title: 'Staff Settings', links: [{ name: 'Logout', href: '/login', icon: LogOut }] };
       let links = cat.links.filter((l: any) => ['New Prescription', 'Online Rx', 'Rx Templates'].includes(l.name));
       if (!perms.canCreateLocalRx) links = [];
       return { ...cat, links };
    }
    return cat;
  }).filter((cat: any) => cat && cat.links.length > 0);

  let displayName = user?.name || 'Doctor';
  if (!isStaff && !displayName.toLowerCase().includes('doctor')) {
    displayName = 'Dr. ' + displayName;
  }

  useEffect(() => {
    if (user && !isStaff) {
      fetch('/api/doctor/update-profile', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.doctor && data.doctor.verificationStatus) {
            setKycStatus(data.doctor.verificationStatus);
          }
        })
        .catch(console.error);
    }
  }, [user, isStaff]);

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide h-full">
            <span className="text-xl font-black text-blue-600 hidden sm:block">Tshastho</span>
            <div className="flex items-center gap-1 h-full">
              {filteredMainLinks.map((link: any) => {
                const isActive = pathname === link.href || (link.href !== '/doctor' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 h-full text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <link.icon size={18} />
                    <span className="hidden sm:block">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition flex items-center gap-2 text-sm font-semibold"
            >
              <Menu size={20} />
              <span className="hidden sm:block">Menu</span>
            </button>
            <button
              onClick={() => {
                document.cookie = "tshastho_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
                document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
                router.push('/login');
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          <div className="relative w-full max-w-sm bg-slate-50 h-full shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800">Doctor Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6 pb-20">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-inner overflow-hidden shrink-0">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'D'
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{displayName}</h3>
                  <p className="text-xs text-slate-500 font-medium mb-1.5">
                    {isStaff ? (user?.staffRole || 'Staff') : 'Medicine Specialist'}
                  </p>
                  {!isStaff && (
                    <>
                      {kycStatus === 'VERIFIED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle size={10} /> KYC Verified
                        </span>
                      )}
                      {kycStatus === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
                          <XCircle size={10} /> KYC Rejected
                        </span>
                      )}
                      {kycStatus === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
                          <Clock size={10} /> KYC Pending
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {filteredMenuCategories.map((category: any, idx: number) => (
                <div key={idx}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{category.title}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {category.links.map((link: any) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex flex-col items-start gap-2 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 shadow-sm'}`}
                        >
                          <link.icon size={20} className={isActive ? "text-white" : "text-blue-500"} />
                          <span className="text-xs font-semibold leading-tight">{link.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}