"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Suspense } from "react";
import { 
  Plus, Trash2, Save, ArrowLeft, Search, Mic, MicOff, 
  AlertTriangle, X, Calculator, User, Activity, FileText, CheckCircle2,
  Zap, Stethoscope, Clock, Printer, Bookmark
} from "lucide-react";

const COMMON_TESTS = ["CBC", "Blood Sugar (F)", "Blood Sugar (R)", "Creatinine", "Lipid Profile", "ECG", "USG Whole Abdomen", "X-Ray Chest"];
const COMMON_DIAGNOSES = ["Fever", "URTI", "Gastritis", "Diarrhea", "Hypertension", "Diabetes", "Allergic Rhinitis"];
const DOSAGE_PRESETS = ["1+0+1", "1+1+1", "0+0+1", "1+0+0", "0+0+0"];
const DURATION_PRESETS = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "Continue"];
const DOSAGE_FORMS = ["Tab", "Cap", "Syr", "Inj", "Drop", "Cream", "Inhaler", "Supp"];

const RX_PACKS = [
  {
    name: "Fever & Cold",
    items: [
      { medicineName: "Napa Extend", strength: "665mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "1+1+1", duration: "3 days", quantity: "9", beforeAfterMeal: "After meal", instructions: "Drink plenty of water" },
      { medicineName: "Monas 10", strength: "10mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "0+0+1", duration: "5 days", quantity: "5", beforeAfterMeal: "Bedtime", instructions: "" }
    ]
  },
  {
    name: "Gastric/Acidity",
    items: [
      { medicineName: "Seclo 20", strength: "20mg", dosageForm: "Cap", dosage: "1 capsule", frequency: "1+0+1", duration: "14 days", quantity: "28", beforeAfterMeal: "30m Before", instructions: "" },
      { medicineName: "Amodis 400", strength: "400mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "1+1+1", duration: "5 days", quantity: "15", beforeAfterMeal: "After meal", instructions: "" }
    ]
  },
  {
    name: "Cough & Cold",
    items: [
      { medicineName: "Histacin", strength: "4mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "0+0+1", duration: "5 days", quantity: "5", beforeAfterMeal: "Bedtime", instructions: "May cause drowsiness" },
      { medicineName: "Fexo 120", strength: "120mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "1+0+0", duration: "7 days", quantity: "7", beforeAfterMeal: "30m Before", instructions: "" },
      { medicineName: "Adryl Syrup", strength: "100ml", dosageForm: "Syr", dosage: "2 tsp", frequency: "1+1+1", duration: "5 days", quantity: "1", beforeAfterMeal: "After meal", instructions: "" }
    ]
  },
  {
    name: "Diarrhea",
    items: [
      { medicineName: "Zinc 20", strength: "20mg", dosageForm: "Tab", dosage: "1 tablet", frequency: "0+0+1", duration: "14 days", quantity: "14", beforeAfterMeal: "After meal", instructions: "" },
      { medicineName: "Orsaline-N", strength: "Sachet", dosageForm: "Tab", dosage: "1 sachet", frequency: "As needed", duration: "3 days", quantity: "5", beforeAfterMeal: "Not applicable", instructions: "Mix in 500ml water" }
    ]
  }
];

const MEDICINE_SUGGESTIONS = ["Napa", "Napa Extend", "Seclo", "Monas", "Amodis", "Sergel", "Maxpro", "Losec", "Fexo", "Alatrol", "Ceevit", "Zinc 20", "Orsaline-N", "Antazol", "Rupatrol", "Cef-3", "Azimax", "Levo-500", "Pantonix", "Xelor", "Tramadol", "Torrent", "Histacin"];

function NewPrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const prefillPatientId = searchParams.get("patientId") || "";
  const prefillAppointmentId = searchParams.get("appointmentId") || "";

  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientAllergies, setPatientAllergies] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [form, setForm] = useState({
    chiefComplaint: "", examination: "", diagnosis: "", investigations: "", advice: "", followUpDate: "", followUpNotes: "",
  });

  const [items, setItems] = useState<any[]>([
    { medicineName: "", strength: "", dosageForm: "", dosage: "", frequency: "", duration: "", quantity: "", beforeAfterMeal: "", instructions: "" },
  ]);

  const [listeningField, setListeningField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const medicineInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null); // For smooth scroll

  useEffect(() => {
    if (!user) return;
    fetch("/api/doctor/appointments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const unique = new Map();
        (d.appointments || []).forEach((a: any) => {
          if (a.patient && !unique.has(a.patient.id)) unique.set(a.patient.id, a.patient);
        });
        const list = Array.from(unique.values());
        setPatients(list);
        if (prefillPatientId) {
          const found = list.find((p: any) => p.id === prefillPatientId);
          if (found) setSelectedPatient(found);
        }
      });

    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (listeningField) {
            setForm(prev => ({ ...prev, [listeningField]: prev[listeningField as keyof typeof prev] + " " + transcript }));
          }
        };
        recognitionRef.current.onend = () => setListeningField(null);
        recognitionRef.current.onerror = () => setListeningField(null);
      }
    }
  }, [user, prefillPatientId, listeningField]);

  useEffect(() => {
    if (selectedPatient) {
      fetch(`/api/patients/${selectedPatient.id}/allergies`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.allergies) setPatientAllergies(data.allergies);
          else setPatientAllergies([]);
        })
        .catch(() => setPatientAllergies([]));
    } else {
      setPatientAllergies([]);
    }
  }, [selectedPatient]);

  const toggleDictation = (field: string) => {
    if (listeningField === field) {
      recognitionRef.current?.stop();
      setListeningField(null);
    } else {
      recognitionRef.current?.start();
      setListeningField(field);
    }
  };

  const calculateQuantity = (frequency: string, duration: string) => {
    if (!frequency || !duration) return "";
    if (duration.toLowerCase() === "continue" || duration.toLowerCase() === "as needed") return "As directed";
    const freqMatch = frequency.match(/\d+/g);
    const dailyDose = freqMatch ? freqMatch.reduce((sum, num) => sum + parseInt(num), 0) : 0;
    let days = 0;
    if (duration.toLowerCase().includes("month")) {
      const m = duration.match(/\d+/);
      days = m ? parseInt(m[0]) * 30 : 30;
    } else {
      const d = duration.match(/\d+/);
      days = d ? parseInt(d[0]) : 0;
    }
    if (dailyDose > 0 && days > 0) return (dailyDose * days).toString();
    return "";
  };

  const addItem = () => {
    setItems([...items, { medicineName: "", strength: "", dosageForm: "", dosage: "", frequency: "", duration: "", quantity: "", beforeAfterMeal: "", instructions: "" }]);
    setTimeout(() => {
      const lastIndex = items.length;
      medicineInputRefs.current[lastIndex]?.focus();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" && idx === items.length - 1) {
      e.preventDefault();
      addItem();
    }
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], [field]: value };
      if (field === "frequency" || field === "duration") {
        const calculatedQty = calculateQuantity(newItems[idx].frequency, newItems[idx].duration);
        if (calculatedQty) newItems[idx].quantity = calculatedQty;
      }
      if (field === "dosageForm") {
        const dosageMap: Record<string, string> = {
          "Tab": "1 tablet", "Cap": "1 capsule", "Syr": "5 ml", "Inj": "1 ampoule", 
          "Drop": "1 drop", "Cream": "Apply thinly", "Inhaler": "2 puffs", "Supp": "1 suppository"
        };
        newItems[idx].dosage = dosageMap[value] || "";
      }
      return newItems;
    });
  };

  const addInvestigation = (test: string) => {
    const current = form.investigations.trim();
    if (!current.includes(test)) {
      setForm({ ...form, investigations: current ? `${current}, ${test}` : test });
    }
  };

  const setDiagnosis = (diag: string) => {
    const current = form.diagnosis.trim();
    if (!current.includes(diag)) {
      setForm({ ...form, diagnosis: current ? `${current}, ${diag}` : diag });
    }
  };

  const applyRxPack = (pack: any) => {
    const newItems = pack.items.map((item: any) => ({ ...item }));
    if (items.length === 1 && !items[0].medicineName) {
      setItems(newItems);
    } else {
      setItems([...items, ...newItems]);
    }
  };

  const setFollowUpPreset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const dateString = date.toISOString().split('T')[0];
    setForm({ ...form, followUpDate: dateString });
  };

  const handleSaveDraft = () => {
    localStorage.setItem('rx_draft', JSON.stringify({ form, items, selectedPatient }));
    alert("Draft saved locally! You can safely close this page.");
  };

  const handleSubmit = async (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    if (!selectedPatient) { setMessage("Please select a patient"); return; }
    if (items.some(i => !i.medicineName.trim())) { setMessage("Please fill all medicine names"); return; }

    setSaving(true); setMessage("");

    const res = await fetch("/api/doctor/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patientId: selectedPatient.id,
        appointmentId: prefillAppointmentId || undefined,
        ...form,
        items: items.filter(i => i.medicineName.trim()),
      }),
    });

    const data = await res.json();
    setSaving(false);
    localStorage.removeItem('rx_draft'); // Clear draft on success

    if (res.ok) {
      if (andPrint) router.push(`/doctor/prescriptions/${data.prescription.id}?print=true`);
      else router.push(`/doctor/prescriptions/${data.prescription.id}`);
    } else {
      setMessage(data.message || "Failed to create");
    }
  };

  const filteredPatients = patients.filter((p) =>
    !patientSearch || p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone?.includes(patientSearch)
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-slate-800 text-lg">New Prescription</h1>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Patient Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-600"/> Patient Details
          </h2>
          
          {selectedPatient ? (
            <div className="flex flex-col gap-4 sticky top-[60px] z-30"> {/* STICKY BAR */}
              <div className="flex items-center justify-between bg-blue-600 border border-blue-700 p-4 rounded-xl shadow-md text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                    {selectedPatient.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold">{selectedPatient.name}</div>
                    <div className="text-sm text-blue-100 flex items-center gap-2">
                      <span>{selectedPatient.phone}</span>
                      <span className="text-blue-300">|</span>
                      <span>{selectedPatient.gender || "N/A"}</span>
                    </div>
                  </div>
                </div>
                {!prefillPatientId && (
                  <button type="button" onClick={() => setSelectedPatient(null)} className="text-sm bg-white/20 px-3 py-1 rounded-lg font-medium hover:bg-white/30 transition-colors">
                    Change
                  </button>
                )}
              </div>

              {patientAllergies.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="text-sm font-bold text-red-800">Allergy Warning!</div>
                    <div className="text-sm text-red-700 mt-1">
                      Allergic to: <strong>{patientAllergies.map(a => a.allergen).join(", ")}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name or phone..." 
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                {filteredPatients.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No patients found.</p>
                ) : (
                  filteredPatients.map((p) => (
                    <button key={p.id} type="button" onClick={() => setSelectedPatient(p)}
                      className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 p-3 rounded-xl flex items-center gap-3 transition-all">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-200">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.phone}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clinical Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-600"/> Clinical Notes
          </h2>
          <div className="space-y-5">
            <div className="relative">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Chief Complaint</label>
              <textarea value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                rows={2} placeholder="e.g. Fever for 3 days, headache..." 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none pr-12" />
              <button type="button" onClick={() => toggleDictation('chiefComplaint')} 
                className={`absolute right-3 bottom-4 p-2 rounded-full transition-colors ${listeningField === 'chiefComplaint' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {listeningField === 'chiefComplaint' ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
            
            <div className="relative">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Examination Findings</label>
              <textarea value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value })}
                rows={2} placeholder="e.g. BP: 120/80, Pulse: 72, Temp: 98.6F" 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none pr-12" />
              <button type="button" onClick={() => toggleDictation('examination')}
                className={`absolute right-3 bottom-4 p-2 rounded-full transition-colors ${listeningField === 'examination' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {listeningField === 'examination' ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Diagnosis</label>
                <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  placeholder="Type or click below..." 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                
                {/* QUICK DIAGNOSES */}
                <div className="flex flex-wrap gap-2">
                  {COMMON_DIAGNOSES.map(diag => (
                    <button key={diag} type="button" onClick={() => setDiagnosis(diag)}
                      className="text-xs bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2 py-1 rounded-md border border-slate-200 transition-colors">
                      + {diag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Investigations</label>
                <input value={form.investigations} onChange={(e) => setForm({ ...form, investigations: e.target.value })}
                  placeholder="Type or click below..." 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                
                <div className="flex flex-wrap gap-2">
                  {COMMON_TESTS.map(test => (
                    <button key={test} type="button" onClick={() => addInvestigation(test)}
                      className="text-xs bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2 py-1 rounded-md border border-slate-200 transition-colors">
                      + {test}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medicines (Rx) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Zap size={14} className="text-amber-500"/> One-Click Rx Packs
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {RX_PACKS.map(pack => (
                <button key={pack.name} type="button" onClick={() => applyRxPack(pack)}
                  className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5">
                  <Stethoscope size={14} /> {pack.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-600"/> Medicines (Rx)
            </h2>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 relative group">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg">Rx #{idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Medicine Name *</label>
                    <input 
                      required 
                      list="medicine-suggestions"
                      value={item.medicineName} 
                      onChange={(e) => updateItem(idx, "medicineName", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      ref={el => { medicineInputRefs.current[idx] = el; }}
                      placeholder="e.g. Napa Extend, Seclo 20" 
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Strength</label>
                    <input value={item.strength} onChange={(e) => updateItem(idx, "strength", e.target.value)}
                      placeholder="e.g. 500mg" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Dosage Form</label>
                    <div className="flex flex-wrap gap-1.5">
                      {DOSAGE_FORMS.map(formType => (
                        <button key={formType} type="button" onClick={() => updateItem(idx, "dosageForm", formType)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            item.dosageForm === formType ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}>
                          {formType}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Dosage</label>
                  <input value={item.dosage} onChange={(e) => updateItem(idx, "dosage", e.target.value)}
                    placeholder="e.g. 1 tablet, 5ml, Apply thinly" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Frequency</label>
                    <input value={item.frequency} onChange={(e) => updateItem(idx, "frequency", e.target.value)}
                      placeholder="e.g. 1+0+1" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                    <div className="flex gap-1">
                      {DOSAGE_PRESETS.map(preset => (
                        <button key={preset} type="button" onClick={() => updateItem(idx, "frequency", preset)}
                          className={`flex-1 text-[10px] font-bold py-1 rounded border transition-colors ${item.frequency === preset ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Duration</label>
                    <input value={item.duration} onChange={(e) => updateItem(idx, "duration", e.target.value)}
                      placeholder="e.g. 7 days" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                    <div className="flex flex-wrap gap-1">
                      {DURATION_PRESETS.map(preset => (
                        <button key={preset} type="button" onClick={() => updateItem(idx, "duration", preset)}
                          className={`text-[10px] font-bold px-1.5 py-1 rounded border transition-colors ${item.duration === preset ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-between">
                      Quantity <Calculator size={14} className="text-blue-500"/>
                    </label>
                    <input value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      placeholder="Auto or As directed" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/50" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-600 mb-2 block">Meal Timing</label>
                  <div className="flex flex-wrap gap-2">
                    {['30m Before', '1h Before', 'After meal', 'Empty stomach', 'Bedtime', 'Not applicable'].map((meal) => (
                      <button key={meal} type="button" onClick={() => updateItem(idx, "beforeAfterMeal", meal)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          item.beforeAfterMeal === meal ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                        }`}>
                        {meal}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Special Instructions (Optional)</label>
                  <input value={item.instructions} onChange={(e) => updateItem(idx, "instructions", e.target.value)}
                    placeholder="e.g. Take with plenty of water, Do not crush" className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            ))}
          </div>
          <div ref={bottomRef} /> {/* Scroll anchor */}
          
          {/* FLOATING ADD BUTTON FOR MOBILE */}
          <div className="fixed bottom-20 right-4 md:right-[calc(50%-22rem)] z-30">
             <button type="button" onClick={addItem} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-95 shadow-blue-600/40">
               <Plus size={24} />
             </button>
          </div>
        </div>

        {/* Advice & Follow-up */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-600"/> Advice & Follow-up
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Advice</label>
              <textarea value={form.advice} onChange={(e) => setForm({ ...form, advice: e.target.value })}
                rows={2} placeholder="e.g. Drink plenty of water, avoid cold drinks..." 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Follow-up Date</label>
                <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                <div className="flex gap-1">
                  <button type="button" onClick={() => setFollowUpPreset(7)} className="text-xs font-semibold bg-slate-100 hover:bg-blue-100 text-slate-600 px-2 py-1 rounded border border-slate-200">1 Week</button>
                  <button type="button" onClick={() => setFollowUpPreset(14)} className="text-xs font-semibold bg-slate-100 hover:bg-blue-100 text-slate-600 px-2 py-1 rounded border border-slate-200">2 Weeks</button>
                  <button type="button" onClick={() => setFollowUpPreset(30)} className="text-xs font-semibold bg-slate-100 hover:bg-blue-100 text-slate-600 px-2 py-1 rounded border border-slate-200">1 Month</button>
                  <button type="button" onClick={() => setFollowUpPreset(90)} className="text-xs font-semibold bg-slate-100 hover:bg-blue-100 text-slate-600 px-2 py-1 rounded border border-slate-200">3 Months</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Follow-up Notes</label>
                <input value={form.followUpNotes} onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                  placeholder="e.g. Bring previous reports" 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {message && (
  <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-auto md:w-[calc(100%-2rem)] md:max-w-4xl mx-auto bg-red-600 text-white p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom">
    <AlertTriangle size={20} className="shrink-0" />
    <p className="text-sm font-bold flex-1">{message}</p>
    <button type="button" onClick={() => setMessage("")} className="p-1 hover:bg-white/20 rounded-lg"><X size={16}/></button>
  </div>
)}
      </form>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          <button type="button" onClick={handleSaveDraft} disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors">
            <Save size={18} /> Save Draft
          </button>
          
          <button type="button" onClick={() => handleSubmit(new Event('submit') as any, true)} disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-600/20">
            <Printer size={18} /> {saving ? "Saving..." : "Save & Print"}
          </button>
        </div>
      </div>
      
      <datalist id="medicine-suggestions">
        {MEDICINE_SUGGESTIONS.map(med => (
          <option key={med} value={med} />
        ))}
      </datalist>
    </div>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500 font-medium">Loading Form...</div>}>
      <NewPrescriptionForm />
    </Suspense>
  );
}
