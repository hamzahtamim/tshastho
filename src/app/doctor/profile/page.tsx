"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User, Award, FileText, Plus, X, Upload, Trash2, Save, CheckCircle, Briefcase, Building2, Star, MessageSquare } from "lucide-react";

const DOC_TYPES = ["LICENSE", "DEGREE", "CERTIFICATE", "NID", "PHOTO", "OTHER"];

export default function DoctorProfilePage() {
  const { user } = useAuth();
  if (user?.role === 'DOCTOR_STAFF') return <div className="p-8 text-center font-bold text-red-500">Access Denied. You are a staff member. You cannot edit the doctor's profile.</div>;
  const [tab, setTab] = useState<"basic" | "specialties" | "qualifications" | "experience" | "awards" | "memberships" | "documents" | "reviews">("basic");
  const [profile, setProfile] = useState<any>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");

  const [basicForm, setBasicForm] = useState({
    specialty: "", licenseNumber: "", experience: 0, consultationFee: 0,
    bookingPhone: "", chamberAddress: "", bio: "", gender: "", languages: "",
    hospitalAffiliation: "", subSpecialties: "", onlineAvailable: true, inPersonAvailable: true,
    onlineFee: "", offlineFee: "", videoIntroUrl: "", emergencyAvailable: false, services: "", insurances: "",
  });

  const [newSpecialty, setNewSpecialty] = useState({ name: "", isPrimary: false });
  const [newQual, setNewQual] = useState({ degree: "", institution: "", year: 2000, country: "" });
  const [newDoc, setNewDoc] = useState({ type: "LICENSE", title: "", fileUrl: "" });
  const [experiences, setExperiences] = useState<any[]>([]);
  const [newExp, setNewExp] = useState({ hospitalName: "", designation: "", startYear: "", endYear: "", isCurrent: false });
  const [awards, setAwards] = useState<any[]>([]);
  const [newAward, setNewAward] = useState({ title: "", issuer: "", year: "" });
  const [memberships, setMemberships] = useState<any[]>([]);
  const [doctorReviews, setDoctorReviews] = useState<any[]>([]);
  const [newMembership, setNewMembership] = useState({ organization: "", role: "" });
  const [signatureUrl, setSignatureUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");


  const fetchDoctorReviews = async (docId: string) => {
    try {
      const res = await fetch(`/api/doctors/${docId}/reviews`);
      const data = await res.json();
      if (data.success) setDoctorReviews(data.reviews);
    } catch (err) { console.error(err); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, q, d, e, a, m] = await Promise.all([
        fetch("/api/doctor/update-profile", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/specialties", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/qualifications", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/documents", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/experiences", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/awards", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
        fetch("/api/doctor/memberships", { credentials: "include" }).then(r => r.json()).catch(() => ({})),
      ]);
      if (p.doctor) {
        setProfile(p.doctor);
        fetchDoctorReviews(p.doctor.id);
        setSignatureUrl(p.doctor.signatureUrl || "");
        setAvatarUrl(p.doctor.user?.avatarUrl || "");
        setBasicForm({
          specialty: p.doctor.specialty || "", licenseNumber: p.doctor.licenseNumber || "",
          experience: p.doctor.experience || 0, consultationFee: Number(p.doctor.consultationFee) || 0,
          bookingPhone: p.doctor.bookingPhone || "", chamberAddress: p.doctor.chamberAddress || "",
          bio: p.doctor.bio || "", gender: p.doctor.gender || "", languages: p.doctor.languages || "",
          hospitalAffiliation: p.doctor.hospitalAffiliation || "", subSpecialties: p.doctor.subSpecialties || "",
          onlineAvailable: p.doctor.onlineAvailable ?? true, inPersonAvailable: p.doctor.inPersonAvailable ?? true,
          onlineFee: p.doctor.onlineFee?.toString() || "", offlineFee: p.doctor.offlineFee?.toString() || "",
          videoIntroUrl: p.doctor.videoIntroUrl || "", emergencyAvailable: p.doctor.emergencyAvailable ?? false,
          services: p.doctor.services || "", insurances: p.doctor.insurances || "",
        });
      }
      setSpecialties(s.specialties || []);
      setQualifications(q.qualifications || []);
      setDocuments(d.documents || []);
      setExperiences(e.experiences || []);
      setAwards(a.awards || []);
      setMemberships(m.memberships || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);


  const uploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("Uploading signature...");
    
    const fd = new FormData(); 
    fd.append("file", file);
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setSignatureUrl(data.url); // Update UI immediately
        
        // Save to database
        await fetch("/api/doctor/update-profile", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          credentials: "include", 
          body: JSON.stringify({ ...basicForm, signatureUrl: data.url }),
        });
        
        setMessage("✅ Signature saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Failed to upload signature.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Network error.");
    } finally {
      setUploading(false);
    }
  };

  const saveBasic = async () => {
    setSaving(true); setMessage("");
    const res = await fetch("/api/doctor/update-profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(basicForm),
    });
    setSaving(false);
    if (res.ok) setMessage("✅ Saved!");
    else setMessage("Failed to save");
    setTimeout(() => setMessage(""), 3000);
  };

  const saveSpecialties = async (list: any[]) => {
    setSaving(true);
    await fetch("/api/doctor/specialties", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ specialties: list }),
    });
    setSaving(false); load();
  };

  const addSpecialty = () => {
    if (!newSpecialty.name.trim()) return;
    const updated = [...specialties.map(s => ({ ...s, isPrimary: false })), newSpecialty];
    setSpecialties(updated); saveSpecialties(updated);
    setNewSpecialty({ name: "", isPrimary: false });
  };

  const removeSpecialty = (idx: number) => {
    const updated = specialties.filter((_, i) => i !== idx);
    setSpecialties(updated); saveSpecialties(updated);
  };

  const saveQualifications = async (list: any[]) => {
    setSaving(true);
    await fetch("/api/doctor/qualifications", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ qualifications: list }),
    });
    setSaving(false); load();
  };

  const addQualification = () => {
    if (!newQual.degree.trim()) return;
    const updated = [...qualifications, newQual];
    setQualifications(updated); saveQualifications(updated);
    setNewQual({ degree: "", institution: "", year: 2000, country: "" });
  };

  const removeQualification = (idx: number) => {
    const updated = qualifications.filter((_, i) => i !== idx);
    setQualifications(updated); saveQualifications(updated);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    setUploading(false);
    if (res.ok && data.url) setNewDoc({ ...newDoc, fileUrl: data.url });
  };

  const saveDocument = async () => {
    if (!newDoc.fileUrl) { setMessage("Please upload a file first"); return; }
    setSaving(true);
    await fetch("/api/doctor/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(newDoc),
    });
    setSaving(false);
    setNewDoc({ type: "LICENSE", title: "", fileUrl: "" });
    load();
    setMessage("✅ Document added");
    setTimeout(() => setMessage(""), 3000);
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/doctor/documents?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const verifColor = (s: string) => {
    switch (s) {
      case "VERIFIED": return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
      case "UNDER_REVIEW": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };


  const addExperience = async () => {
    if (!newExp.hospitalName || !newExp.designation || !newExp.startYear) return;
    await fetch("/api/doctor/experiences", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(newExp) });
    setNewExp({ hospitalName: "", designation: "", startYear: "", endYear: "", isCurrent: false });
    load();
  };
  const deleteExperience = async (id: string) => {
    if (!confirm("Delete this experience?")) return;
    await fetch(`/api/doctor/experiences?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const addAward = async () => {
    if (!newAward.title || !newAward.year) return;
    await fetch("/api/doctor/awards", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(newAward) });
    setNewAward({ title: "", issuer: "", year: "" });
    load();
  };
  const deleteAward = async (id: string) => {
    if (!confirm("Delete this award?")) return;
    await fetch(`/api/doctor/awards?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const addMembership = async () => {
    if (!newMembership.organization) return;
    await fetch("/api/doctor/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(newMembership) });
    setNewMembership({ organization: "", role: "" });
    load();
  };
  const deleteMembership = async (id: string) => {
    if (!confirm("Delete this membership?")) return;
    await fetch(`/api/doctor/memberships?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading profile...</div>;


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setAvatarUrl(data.url); // Instantly update UI
        await fetch("/api/doctor/update-profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ ...basicForm, avatarUrl: data.url }),
        });
        setMessage("✅ Profile photo updated!");
        await load(); // Refresh data silently
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Upload failed.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Network error occurred.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setUploadingAvatar(false);
    }
  };


  // Calculate Profile Completion Percentage
  let totalPoints = 0;
  let earnedPoints = 0;
  
  // Basic checks (10 points each)
  if (avatarUrl) earnedPoints += 10;
  totalPoints += 10;
  if (signatureUrl) earnedPoints += 10;
  totalPoints += 10;
  if (basicForm.bio) earnedPoints += 10;
  totalPoints += 10;
  if (basicForm.chamberAddress) earnedPoints += 10;
  totalPoints += 10;
  if (basicForm.onlineFee || basicForm.offlineFee) earnedPoints += 10;
  totalPoints += 10;
  if (basicForm.services) earnedPoints += 10;
  totalPoints += 10;
  if (basicForm.hospitalAffiliation) earnedPoints += 10;
  totalPoints += 10;
  
  // Relation checks (10 points each)
  if (qualifications.length > 0) earnedPoints += 10;
  totalPoints += 10;
  if (experiences.length > 0) earnedPoints += 10;
  totalPoints += 10;
  if (documents.length > 0) earnedPoints += 10;
  totalPoints += 10;
  
  const completionPercentage = Math.round((earnedPoints / totalPoints) * 100);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-[80vh] pb-20">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
        
        {/* Avatar Upload Area */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-blue-500">{user?.name?.charAt(0).toUpperCase() || "D"}</span>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition transform hover:scale-110">
            <Upload size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-800">Dr. {user?.name || profile?.user?.name || "Doctor"}</h1>
          <p className="text-blue-600 font-medium">{basicForm.specialty || "Specialist"}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
            {/* Premium Status Badge */}
            {profile?.verificationStatus === "VERIFIED" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                <CheckCircle size={12} /> Verified
              </span>
            ) : profile?.verificationStatus === "REJECTED" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                <X size={12} /> Rejected
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1" title="Your profile is under review by Admin">
                <FileText size={12} /> Pending Approval
              </span>
            )}
            
            {basicForm.hospitalAffiliation && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                {basicForm.hospitalAffiliation}
              </span>
            )}
          </div>
        </div>
      </div>

            {/* Profile Completion Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-6 flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className={`${completionPercentage === 100 ? 'text-green-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${completionPercentage}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-sm font-bold text-slate-800">{completionPercentage}%</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1">
            <h3 className="font-bold text-slate-800 text-sm">Profile Strength</h3>
            {completionPercentage < 100 && (
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">Action Needed</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {completionPercentage === 100 
              ? "Excellent! Your profile is fully complete." 
              : "Complete your profile to build trust with patients."}
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 mb-6 scrollbar-hide">
        {[
          { k: "basic", label: "Basic Info", icon: User },
          { k: "specialties", label: "Specialties", icon: Award },
          { k: "qualifications", label: "Qualifications", icon: Award },
          { k: "experience", label: "Experience", icon: Briefcase },
          { k: "awards", label: "Awards", icon: Award },
          { k: "memberships", label: "Memberships", icon: Building2 },
          { k: "reviews", label: "Reviews", icon: Star },
          { k: "documents", label: "Documents", icon: FileText },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.k ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {message && <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium text-center">{message}</div>}

      {tab === "basic" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Primary Specialty</label>
              <input value={basicForm.specialty} onChange={(e) => setBasicForm({ ...basicForm, specialty: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Cardiology" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">License Number</label>
              <input value={basicForm.licenseNumber} onChange={(e) => setBasicForm({ ...basicForm, licenseNumber: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="BMDC-XXXXX" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Experience (Years)</label>
              <input type="number" value={basicForm.experience} onChange={(e) => setBasicForm({ ...basicForm, experience: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Consultation Fee (৳)</label>
              <input type="number" value={basicForm.consultationFee} onChange={(e) => setBasicForm({ ...basicForm, consultationFee: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Booking Phone</label>
              <input value={basicForm.bookingPhone} onChange={(e) => setBasicForm({ ...basicForm, bookingPhone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Gender</label>
              <select value={basicForm.gender} onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Chamber Address</label>
              <input value={basicForm.chamberAddress} onChange={(e) => setBasicForm({ ...basicForm, chamberAddress: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Hospital Affiliation</label>
              <input value={basicForm.hospitalAffiliation} onChange={(e) => setBasicForm({ ...basicForm, hospitalAffiliation: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Dhaka Medical College" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Languages Spoken</label>
              <input value={basicForm.languages} onChange={(e) => setBasicForm({ ...basicForm, languages: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Bengali, English, Hindi" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Sub-specialties</label>
              <input value={basicForm.subSpecialties} onChange={(e) => setBasicForm({ ...basicForm, subSpecialties: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g., Interventional Cardiology" />
            </div>
                        <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Bio / About</label>
              <textarea rows={4} value={basicForm.bio} onChange={(e) => setBasicForm({ ...basicForm, bio: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Write a brief introduction about yourself..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Online Fee (৳)</label>
              <input type="number" value={basicForm.onlineFee} onChange={(e) => setBasicForm({ ...basicForm, onlineFee: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. 300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Offline Fee (৳)</label>
              <input type="number" value={basicForm.offlineFee} onChange={(e) => setBasicForm({ ...basicForm, offlineFee: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. 500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Video Intro URL (YouTube)</label>
              <input value={basicForm.videoIntroUrl} onChange={(e) => setBasicForm({ ...basicForm, videoIntroUrl: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Services Offered</label>
              <input value={basicForm.services} onChange={(e) => setBasicForm({ ...basicForm, services: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. ECG, Diabetes Care, Minor Surgery (comma separated)" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Accepted Insurances</label>
              <input value={basicForm.insurances} onChange={(e) => setBasicForm({ ...basicForm, insurances: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. MetLife, Guardian (comma separated)" />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="checkbox" checked={basicForm.onlineAvailable} onChange={(e) => setBasicForm({ ...basicForm, onlineAvailable: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
              Available for Online Consultation
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="checkbox" checked={basicForm.inPersonAvailable} onChange={(e) => setBasicForm({ ...basicForm, inPersonAvailable: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
              Available for In-person Visit
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
              <input type="checkbox" checked={basicForm.emergencyAvailable} onChange={(e) => setBasicForm({ ...basicForm, emergencyAvailable: e.target.checked })} className="w-4 h-4 text-red-600 rounded" />
              Available for Emergency
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Digital Signature (For Prescriptions)</label>
            <div className="flex items-center gap-4">
              {signatureUrl ? (
                <div className="relative border border-slate-200 rounded-lg p-2 bg-white">
                  <img src={signatureUrl} alt="Signature" className="h-12 object-contain" />
                  <button onClick={() => setSignatureUrl("")} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition">
                  <Upload size={16} /> <span className="text-sm font-medium">Upload Signature</span>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadSignature} />
                </label>
              )}
              {uploading && <span className="text-sm text-blue-600">Uploading...</span>}
            </div>
          </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
            <button onClick={saveBasic} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
              <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {tab === "specialties" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-3">
            {specialties.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{s.name}</p>
                  {s.isPrimary && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Primary</span>}
                </div>
                <button onClick={() => removeSpecialty(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {specialties.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No specialties added yet.</p>}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Add New Specialty</h4>
            <div className="flex flex-col md:flex-row gap-3">
              <input value={newSpecialty.name} onChange={(e) => setNewSpecialty({ ...newSpecialty, name: e.target.value })}
                placeholder="Specialty name" className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                <input type="checkbox" checked={newSpecialty.isPrimary} onChange={(e) => setNewSpecialty({ ...newSpecialty, isPrimary: e.target.checked })} className="w-4 h-4" /> Set as Primary
              </label>
              <button onClick={addSpecialty} className="flex items-center justify-center gap-1 bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "qualifications" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-3">
            {qualifications.map((q, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{q.degree}</p>
                  <p className="text-xs text-slate-500">{q.institution} {q.year ? `• ${q.year}` : ""} {q.country ? `• ${q.country}` : ""}</p>
                </div>
                <button onClick={() => removeQualification(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {qualifications.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No qualifications added yet.</p>}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Add Qualification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input value={newQual.degree} onChange={(e) => setNewQual({ ...newQual, degree: e.target.value })} placeholder="Degree (e.g. MBBS)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input value={newQual.institution} onChange={(e) => setNewQual({ ...newQual, institution: e.target.value })} placeholder="Institution" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="number" value={newQual.year} onChange={(e) => setNewQual({ ...newQual, year: Number(e.target.value) })} placeholder="Year" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input value={newQual.country} onChange={(e) => setNewQual({ ...newQual, country: e.target.value })} placeholder="Country" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={addQualification} className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition">
              <Plus size={16} /> Add Qualification
            </button>
          </div>
        </div>
      )}

      
      {/* Experience Tab */}
      {tab === "experience" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-4">
            {experiences.map((exp: any) => (
              <div key={exp.id} className="flex items-start gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Briefcase size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{exp.designation}</h4>
                  <p className="text-sm text-slate-600">{exp.hospitalName}</p>
                  <p className="text-xs text-slate-500 mt-1">{exp.startYear} - {exp.isCurrent ? "Present" : exp.endYear}</p>
                </div>
                <button onClick={() => deleteExperience(exp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {experiences.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No experience added yet.</p>}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Add Experience</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input value={newExp.hospitalName} onChange={(e) => setNewExp({ ...newExp, hospitalName: e.target.value })} placeholder="Hospital/Clinic Name" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input value={newExp.designation} onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })} placeholder="Designation (e.g. Senior Consultant)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="number" value={newExp.startYear} onChange={(e) => setNewExp({ ...newExp, startYear: e.target.value })} placeholder="Start Year (e.g. 2018)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <div className="flex items-center gap-2">
                <input type="number" value={newExp.endYear} onChange={(e) => setNewExp({ ...newExp, endYear: e.target.value })} disabled={newExp.isCurrent} placeholder="End Year" className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50" />
                <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <input type="checkbox" checked={newExp.isCurrent} onChange={(e) => setNewExp({ ...newExp, isCurrent: e.target.checked, endYear: "" })} className="w-4 h-4 rounded" /> Current
                </label>
              </div>
            </div>
            <button onClick={addExperience} className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition">
              <Plus size={16} /> Add Experience
            </button>
          </div>
        </div>
      )}

      {/* Awards Tab */}
      {tab === "awards" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-4">
            {awards.map((award: any) => (
              <div key={award.id} className="flex items-start gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                  <Award size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{award.title}</h4>
                  <p className="text-sm text-slate-600">{award.issuer}</p>
                  <p className="text-xs text-slate-500 mt-1">Year: {award.year}</p>
                </div>
                <button onClick={() => deleteAward(award.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {awards.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No awards added yet.</p>}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Add Award</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={newAward.title} onChange={(e) => setNewAward({ ...newAward, title: e.target.value })} placeholder="Award Title" className="md:col-span-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input value={newAward.issuer} onChange={(e) => setNewAward({ ...newAward, issuer: e.target.value })} placeholder="Issued By (Optional)" className="md:col-span-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="number" value={newAward.year} onChange={(e) => setNewAward({ ...newAward, year: e.target.value })} placeholder="Year (e.g. 2023)" className="md:col-span-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={addAward} className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition">
              <Plus size={16} /> Add Award
            </button>
          </div>
        </div>
      )}

      {/* Memberships Tab */}
      {tab === "memberships" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-4">
            {memberships.map((mem: any) => (
              <div key={mem.id} className="flex items-start gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{mem.organization}</h4>
                  <p className="text-sm text-slate-600">{mem.role}</p>
                </div>
                <button onClick={() => deleteMembership(mem.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {memberships.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No memberships added yet.</p>}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Add Membership</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input value={newMembership.organization} onChange={(e) => setNewMembership({ ...newMembership, organization: e.target.value })} placeholder="Organization (e.g. BMA)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input value={newMembership.role} onChange={(e) => setNewMembership({ ...newMembership, role: e.target.value })} placeholder="Role (e.g. Life Member)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={addMembership} className="w-full flex items-center justify-center gap-1 bg-slate-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition">
              <Plus size={16} /> Add Membership
            </button>
          </div>
        </div>
      )}

      
      {/* Reviews Tab */}
      {tab === "reviews" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Patient Reviews</h3>
              <p className="text-sm text-slate-500">See what your patients are saying about you.</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <Star className="fill-blue-600" size={20} />
                <span className="text-2xl font-bold">{Number(profile?.averageRating || 0).toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wider">{profile?.totalReviews || 0} Reviews</p>
            </div>
          </div>

          <div className="space-y-4">
            {doctorReviews.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-10">No reviews yet. Patients can review you from your public profile.</p>
            ) : (
              doctorReviews.map((review: any) => (
                <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-600 font-bold">
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
                        <Star key={star} size={14} className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mt-2">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-3">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                  <FileText className="text-blue-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{d.title || d.type}</p>
                  <p className="text-xs text-slate-500">{d.type}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${verifColor(d.status)}`}>{d.status}</span>
                <button onClick={() => deleteDocument(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
              </div>
            ))}
            {documents.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No documents uploaded yet.</p>}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3 text-sm">Upload New Document</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <select value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} placeholder="Document Title (Optional)" className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            {newDoc.fileUrl ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl mb-3">
                <CheckCircle size={18} /> <span className="text-sm font-medium flex-1">File uploaded successfully</span>
                <button onClick={() => setNewDoc({ ...newDoc, fileUrl: "" })} className="p-1 hover:bg-green-100 rounded"><X size={16} /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition mb-3">
                <div className="flex flex-col items-center">
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-500">{uploading ? "Uploading..." : "Click to choose file"}</span>
                </div>
                <input type="file" accept="image/*,application/pdf" onChange={uploadFile} className="hidden" />
              </label>
            )}
            <button onClick={saveDocument} disabled={saving || !newDoc.fileUrl} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition disabled:opacity-50">
              {saving ? "Adding..." : "Add Document"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
