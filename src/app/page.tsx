"use client";

import Link from "next/link";
import { 
  Stethoscope, Building2, Pill, TestTube, Ambulance, Droplets, 
  Home, Globe, ClipboardList, Activity, ShieldCheck, Video, Syringe, Search, Star, ArrowRight 
} from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

export default function HomePage() {
  const { branding } = useBranding();

  const services = [
    { title: "Doctors", icon: Stethoscope, desc: "Book Appointment", href: "/doctors" },
    { title: "Hospitals", icon: Building2, desc: "Find & Book", href: "/hospitals" },
    { title: "Pharmacies", icon: Pill, desc: "Buy Medicine", href: "/medicines" },
    { title: "Diagnostics", icon: TestTube, desc: "Book Tests", href: "/diagnostics" },
    { title: "Ambulance", icon: Ambulance, desc: "Emergency Ride", href: "/ambulance" },
    { title: "Blood Bank", icon: Droplets, desc: "Find Donors", href: "/blood-bank" },
    { title: "Home Care", icon: Home, desc: "Nursing & Care", href: "/home-care" },
    { title: "International", icon: Globe, desc: "Global Hospitals", href: "/international" },
    { title: "Packages", icon: ClipboardList, desc: "Checkup Offers", href: "/packages" },
    { title: "Equipment", icon: Activity, desc: "Rent or Buy", href: "/equipment" },
    { title: "Insurance", icon: ShieldCheck, desc: "Coverage Plans", href: "/insurance" },
    { title: "Telemedicine", icon: Video, desc: "Video Consult", href: "/telemedicine" },
    { title: "Vaccination", icon: Syringe, desc: "Book Vaccine", href: "/vaccination" },
  ];

  const doctors = [
    { name: "Dr. Sarah Mitchell", specialty: "Cardiologist", rating: 4.9, image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Prof. James Wilson", specialty: "Orthopedic", rating: 4.8, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Dr. Aisha Rahman", specialty: "Neurologist", rating: 4.7, image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Dr. Michael Chen", specialty: "Pediatrician", rating: 4.8, image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=300" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      
      {/* Premium Glassmorphism Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <img 
                src={branding.logo || "/logo.png"} 
                alt="Tshastho" 
                className="h-9 md:h-11 w-auto object-contain" 
                onError={(e) => {
                  // যদি ছবি না পাওয়া যায়, তবে টেক্সট দেখাবে
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML += '<span class="text-2xl font-black text-slate-900 tracking-tighter">Tshastho</span>';
                }}
              />
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
              <Link href="/doctors" className="hover:text-blue-600 transition-colors">Find Doctors</Link>
              <Link href="/medicines" className="hover:text-blue-600 transition-colors">Pharmacy</Link>
              <Link href="/diagnostics" className="hover:text-blue-600 transition-colors">Diagnostics</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                Log in
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-cyan-200/40 rounded-full blur-3xl -z-10"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Trusted by 10,000+ Patients
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            All Your Healthcare <br className="hidden md:block"/>
            Needs in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">One Place</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 font-medium">
            Book doctors, order medicines, find hospitals, and more — from anywhere in Bangladesh and around the world.
          </p>

          <div className="max-w-3xl mx-auto bg-white rounded-full shadow-2xl shadow-blue-500/10 p-2 flex flex-col md:flex-row gap-2 border border-slate-100">
            <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-full">
              <Search className="text-slate-400 mr-2" size={20} />
              <input 
                type="text" 
                placeholder="Search doctor, hospital, test..." 
                className="w-full py-3 bg-transparent focus:outline-none text-slate-700 placeholder-slate-400 font-medium" 
              />
            </div>
            <button className="bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-md">
              Search
            </button>
          </div>
        </div>
      </section>
      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Our Services</h2>
            <p className="text-slate-500 text-lg">Everything you need, in one place.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link 
                  href={service.href} 
                  key={index} 
                  className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <Icon size={32} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{service.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{service.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500 text-lg">Get your healthcare needs sorted in three simple steps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Search size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">1. Search</h3>
              <p className="text-slate-500 text-sm">Find the right doctor, hospital, or service near you with our smart search.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ClipboardList size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">2. Book</h3>
              <p className="text-slate-500 text-sm">Choose a convenient date and time, and confirm your booking instantly.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center relative">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Video size={36} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-3">3. Consult</h3>
              <p className="text-slate-500 text-sm">Visit the doctor or consult via secure video call right from your home.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Top Doctors Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Top Rated Doctors</h2>
              <p className="text-slate-500 text-lg">Consult with the best specialists in the country.</p>
            </div>
            <Link href="/doctors" className="text-blue-600 font-bold flex items-center gap-1 hover:gap-2 transition-all mt-4 md:mt-0">
              View All <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doctor, index) => (
              <div key={index} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 group">
                <div className="relative h-80 overflow-hidden">
                  <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" /> {doctor.rating}
                  </div>
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{doctor.name}</h3>
                  <p className="text-sm text-blue-600 font-semibold mb-4">{doctor.specialty}</p>
                  <Link href="/doctors" className="block w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-emerald-500 shadow-md hover:shadow-emerald-500/30 transition-all">
                    Book Appointment
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Healthcare CTA */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500 rounded-full blur-3xl -ml-20 -mb-20"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Global Healthcare Now at Your Fingertips</h2>
          <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
            Book appointments with top doctors and hospitals from USA, UK, India, Malaysia, Singapore and more.
          </p>
          <Link href="/international" className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl">
            Explore International <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            {branding.logo ? (
                <img src={branding.logo} alt="Tshastho" className="h-8 object-contain brightness-0 invert" />
              ) : (
                <span className="text-2xl font-black text-white tracking-tight">Tshastho</span>
            )}
          </div>
          <p className="text-sm text-center md:text-left">© {new Date().getFullYear()} Tshastho. All rights reserved.</p>
          <p className="text-sm font-medium text-slate-500 text-center md:text-right">Better Health, Brighter Tomorrow.</p>
        </div>
      </footer>

    </div>
  );
}
