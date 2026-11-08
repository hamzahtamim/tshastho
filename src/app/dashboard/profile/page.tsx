"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, Phone, MapPin, Droplet, LogOut, 
  Edit3, Camera, Save, X, Shield, User as UserIcon, Gift, Copy,
  CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bloodGroup: "",
    address: "",
    avatarUrl: ""
  });

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        setForm({
          name: data.user.name || "",
          phone: data.user.phone || "",
          bloodGroup: data.user.patientProfile?.bloodGroup || "",
          address: data.user.patientProfile?.address || data.user.address || "",
          avatarUrl: data.user.avatarUrl || ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchProfile();
  }, [user, authLoading, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(prev => ({ ...prev, avatarUrl: data.url }));
      } else {
        setMessage("Image upload failed");
      }
    } catch {
      setMessage("Error uploading image");
    }
    setUploading(false);
  };

  const handleCopyCode = () => {
    if (profile?.myReferralCode) {
      navigator.clipboard.writeText(profile.myReferralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        await fetchProfile(); // Refresh data
        setIsEditing(false);
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await res.json();
        setMessage(data.message || "Failed to update profile");
      }
    } catch {
      setMessage("Network error. Please try again.");
    }
    setSaving(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-sm">
        <h2 className="text-lg font-bold text-red-600 mb-2">Failed to load profile</h2>
        <p className="text-sm text-slate-500 mb-4">Your session may have expired. Please log out and log in again.</p>
        <button onClick={() => { logout(); }} className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold">Log Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header & Avatar */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-b-3xl shadow-lg"></div>
        
        <div className="absolute top-4 right-4 flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border border-white/30 hover:bg-white/30 transition">
              <Edit3 size={16} /> Edit
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border border-white/30 hover:bg-white/30 transition">
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="relative w-28 h-28">
            <div className="w-full h-full rounded-full border-4 border-slate-50 bg-white shadow-xl overflow-hidden flex items-center justify-center text-blue-600 text-4xl font-bold">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0).toUpperCase() || <UserIcon size={40} />
              )}
            </div>
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Camera size={16} />}
              </button>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
          </div>
        </div>
      </div>

      {/* Profile Info Container */}
      <div className="mt-16 px-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">{profile.name || "Patient"}</h1>
          <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
            <Shield size={14} className="text-emerald-500" /> 
            Patient ID: TSH-{profile.id?.slice(0, 6).toUpperCase()}
          </p>
        </div>

        {message && (
          <div className={`text-sm text-center p-3 rounded-xl mb-4 font-medium ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
          {!isEditing ? (
            /* View Mode */
            <>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0"><Mail size={18} /></div>
                <div><p className="text-xs text-slate-400 font-medium">Email Address</p><p className="text-sm font-bold text-slate-800">{profile.email}</p></div>
              </div>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0"><Phone size={18} /></div>
                <div><p className="text-xs text-slate-400 font-medium">Phone Number</p><p className="text-sm font-bold text-slate-800">{profile.phone || "Not set"}</p></div>
              </div>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 shrink-0"><Droplet size={18} /></div>
                <div><p className="text-xs text-slate-400 font-medium">Blood Group</p><p className="text-sm font-bold text-slate-800">{profile.patientProfile?.bloodGroup || "Not set"}</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0"><MapPin size={18} /></div>
                <div><p className="text-xs text-slate-400 font-medium">Address</p><p className="text-sm font-bold text-slate-800">{profile.patientProfile?.address || profile.address || "Not set"}</p></div>
              </div>
            </>
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Blood Group</label>
                <input type="text" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. O+, A-" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium resize-none" />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {saving ? "Saving..." : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        
        {/* Referral / Invite & Earn Section */}
        {!isEditing && profile?.myReferralCode && (
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Gift size={20}/> Invite & Earn</h3>
              <p className="text-white/80 text-sm mb-4">Share your code. Get ৳50 when they join!</p>
              
              <div className="flex items-center gap-2 bg-white/20 p-2 rounded-xl border border-white/30 backdrop-blur-sm">
                <span className="font-mono text-xl font-bold tracking-widest pl-2 flex-1">{profile.myReferralCode}</span>
                <button 
                  onClick={handleCopyCode}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        {!isEditing && (
          <div className="mt-6">
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition">
              <LogOut size={20} /> Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
