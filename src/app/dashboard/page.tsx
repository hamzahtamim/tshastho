"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Pill,
  TestTube,
  Ambulance,
  Droplets,
  Home,
  Globe,
  ClipboardCheck,
  Activity,
  Shield,
  Video,
  Syringe,
  Search,
  DollarSign,
  Wallet,
} from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [greeting, setGreeting] = useState("Hello");
  const { branding } = useBranding();
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/wallet/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setWallet(data.wallet);
        })
        .catch(console.error);
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
    { title: "Telemedicine", icon: Video, color: "bg-violet-50 text-violet-600", href: "/telemedicine" },
    { title: "Vaccination", icon: Syringe, color: "bg-rose-50 text-rose-600", href: "/vaccination" },
  ];

  return (
    <div className="pb-6">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {branding.logo ? (
            <img src={branding.logo} alt="Tshastho" className="h-8 object-contain" />
          ) : (
            <span className="text-xl font-bold text-blue-600">Tshastho</span>
          )}
        </div>
        <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
          <Search size={18} />
        </button>
      </div>

      {/* Greeting */}
      <h1 className="text-2xl font-bold text-slate-800 mb-1">
        {greeting}, {userName}!
      </h1>
      <p className="text-slate-500 text-sm mb-4">How can we help you today?</p>

      {/* Quick Due Check */}
      <Link
        href="/dashboard/dues"
        className="block bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 mb-4 shadow-md hover:shadow-lg transition"
      >
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
          <span className="text-white text-xl">→</span>
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
            <p className="text-white/80 text-xs">
              Available Balance: Tk {wallet ? Number(wallet.availableBalance).toFixed(2) : "0.00"}
            </p>
          </div>
        </Link>
        <Link href="/wallet/topup" className="text-white text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition">
          Top Up
        </Link>
      </div>

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
            <p className="text-blue-100 text-xs mb-4">
              Get your health checkup package today!
            </p>
            <Link
              href="/packages"
              className="inline-block bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold"
            >
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
            <Link
              key={index}
              href={service.href}
              className="flex flex-col items-center group"
            >
              <div
                className={`w-16 h-16 rounded-2xl ${service.color} flex items-center justify-center mb-2 shadow-sm group-hover:shadow-md transition`}
              >
                <Icon size={26} />
              </div>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                {service.title}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Global Healthcare CTA */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <h3 className="font-bold mb-2">🌍 Global Healthcare</h3>
        <p className="text-slate-400 text-sm mb-3">
          Consult with top doctors from USA, UK, India & more.
        </p>
        <Link
          href="/international"
          className="inline-block bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold"
        >
          Explore International
        </Link>
      </div>
    </div>
  );
}
