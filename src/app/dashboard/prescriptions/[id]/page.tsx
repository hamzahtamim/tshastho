"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, CheckCircle, Calendar, MapPin, Phone, X, Activity } from "lucide-react";
import Image from "next/image";

export default function PatientPrescriptionViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pharmacy Modal State
  const [showPharmacyPicker, setShowPharmacyPicker] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/prescriptions/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const openPharmacyPicker = async () => {
    setShowPharmacyPicker(true);
    setSendMessage("");
    // Fetch available pharmacies
    const res = await fetch("/api/pharmacies/list", { credentials: "include" }).catch(() => null);
    if (res && res.ok) {
      const d = await res.json();
      setPharmacies(d.pharmacies || []);
    } else {
      setPharmacies([]);
    }
  };

  const sendToPharmacy = async (pharmacyId: string) => {
    setSending(true);
    setSendMessage("");
    const res = await fetch(`/api/prescriptions/${params.id}/to-pharmacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pharmacyId }),
    });
    const d = await res.json();
    setSending(false);
    if (res.ok) {
      setSendMessage("✅ Sent to pharmacy successfully!");
      setTimeout(() => {
        setShowPharmacyPicker(false);
        setSendMessage("");
      }, 2000);
    } else {
      setSendMessage(d.message || "Failed to send.");
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500 font-medium">Loading Prescription...</div>;
  if (!data?.prescription) return <div className="p-6 text-center text-slate-500 font-medium">Prescription not found.</div>;

  const p = data.prescription;
  const doc = p.doctor;

  let ageDisplay = "";
  if (p.patient?.patientProfile?.dateOfBirth) {
    const age = Math.floor((new Date().getTime() - new Date(p.patient.patientProfile.dateOfBirth).getTime()) / 31536000000);
    ageDisplay = `${age} yrs`;
  }
  const genderDisplay = p.patient?.patientProfile?.gender || "N/A";
  const finalAgeGender = ageDisplay ? `${ageDisplay} / ${genderDisplay}` : genderDisplay;

  return (
    <div className="min-h-screen bg-slate-100 pb-24 print:bg-white print:pb-0">
      
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          nav, header, [data-app-navbar], .app-navbar { display: none !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* App Navbar (Hidden on Print) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 print:hidden shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <h1 className="font-bold text-slate-800 text-lg">My Prescription</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openPharmacyPicker} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition">
              Send to Pharmacy
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-md shadow-blue-600/20">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Prescription Paper Wrapper */}
      <div className="max-w-[210mm] mx-auto p-4 mt-6 print:p-0 print:mt-0">
        
        <table className="w-full border-collapse">
          
          {/* PRINT ONLY HEADER */}
          <thead className="hidden print:table-header-group">
            <tr>
              <td>
                <div className="pb-4 mb-4 border-b-2 border-blue-600 flex justify-between items-start">
                  <div className="w-1/2">
                    <Image src="/logo.png" alt="Logo" width={140} height={40} className="mb-1 object-contain" />
                    <div className="text-[10px] text-slate-500">Connected Healthcare. Trusted Care.</div>
                  </div>
                  <div className="text-right w-1/2">
                    <div className="font-bold text-slate-800 text-lg">{doc?.name || "Doctor"}</div>
                    {doc?.qualifications && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {Array.isArray(doc.qualifications) ? doc.qualifications.map((q: any) => q.degree).join(", ") : doc.qualifications}
                      </div>
                    )}
                    {doc?.specialty && <div className="text-xs text-blue-600 font-semibold">{doc.specialty}</div>}
                    {doc?.licenseNumber && <div className="text-[10px] text-slate-600 mt-0.5 font-medium">BMDC Reg: {doc.licenseNumber}</div>}
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* MAIN CONTENT */}
          <tbody>
            <tr>
              <td>
                <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 print:p-0 print:shadow-none print:rounded-none relative overflow-hidden" id="prescription-print">
                  
                  {/* Watermark */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] print:opacity-[0.05] z-0">
                    <Image src="/logo.png" alt="Watermark" width={600} height={200} className="-rotate-45 select-none object-contain grayscale" />
                  </div>

                  <div className="relative z-10">
                    
                    {/* SCREEN ONLY HEADER */}
                    <div className="print:hidden border-b-2 border-blue-600 pb-6 mb-6 flex justify-between items-start">
                      <div className="w-1/2">
                        <Image src="/logo.png" alt="Logo" width={180} height={50} className="mb-2 object-contain" priority />
                        <div className="text-xs text-slate-500 font-medium">Connected Healthcare. Trusted Care.</div>
                      </div>
                      <div className="text-right w-1/2">
                        <div className="font-bold text-slate-800 text-xl">{doc?.name || "Doctor"}</div>
                        {doc?.qualifications && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {Array.isArray(doc.qualifications) ? doc.qualifications.map((q: any) => q.degree).join(", ") : doc.qualifications}
                          </div>
                        )}
                        {doc?.specialty && <div className="text-sm text-blue-600 font-semibold">{doc.specialty}</div>}
                        {doc?.licenseNumber && <div className="text-xs text-slate-600 mt-1 font-medium">BMDC Reg: {doc.licenseNumber}</div>}
                      </div>
                    </div>

                    {/* Status Banner */}
                    {p.status === "VERIFIED" && (
                      <div className="print:hidden mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-600" />
                        <div>
                          <div className="text-sm font-bold text-emerald-800">Verified Prescription</div>
                          <div className="text-xs text-emerald-700">This prescription has been verified and is valid for purchase.</div>
                        </div>
                      </div>
                    )}

                    {/* Patient Info Bar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 flex flex-wrap gap-x-10 gap-y-4 items-center avoid-break">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient Name</div>
                        <div className="font-bold text-slate-800">{p.patient?.name || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Age / Gender</div>
                        <div className="font-medium text-slate-700 uppercase">{finalAgeGender}</div>
                      </div>
                      {p.patient?.patientProfile?.bloodGroup && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Blood Group</div>
                          <div className="font-medium text-red-600">{p.patient.patientProfile.bloodGroup}</div>
                        </div>
                      )}
                      <div className="ml-auto text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</div>
                        <div className="font-medium text-slate-700">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 avoid-break">
                      <div className="space-y-4">
                        {p.chiefComplaint && (
                          <div>
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Chief Complaint</div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.chiefComplaint}</p>
                          </div>
                        )}
                        {p.examination && (
                          <div>
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Examination</div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.examination}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {p.diagnosis && (
                          <div>
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Diagnosis</div>
                            <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{p.diagnosis}</p>
                          </div>
                        )}
                        {p.investigations && (
                          <div>
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Investigations</div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.investigations}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rx Symbol */}
                    <div className="text-4xl font-serif text-blue-700 font-bold mb-4">R</div>

                    {/* Medication Table */}
                    <div className="mb-10 border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 w-10 text-center">#</th>
                            <th className="px-4 py-3">Medicine & Strength</th>
                            <th className="px-4 py-3">Dosage</th>
                            <th className="px-4 py-3">Frequency</th>
                            <th className="px-4 py-3">Duration / Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {p.items?.map((item: any, idx: number) => (
                            <tr key={item.id} className="break-inside-avoid hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-800">{item.medicineName}</div>
                                {item.strength && <div className="text-xs text-slate-500">{item.strength}</div>}
                                <div className="flex gap-2 mt-1">
                                  {item.beforeAfterMeal && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.beforeAfterMeal}</span>}
                                  {item.dosageForm && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.dosageForm}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{item.dosage || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">{item.frequency || "-"}</td>
                              <td className="px-4 py-3 text-slate-700">
                                <div>{item.duration || "-"}</div>
                                {item.quantity && <div className="text-xs text-slate-500 font-medium">Qty: {item.quantity}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Advice & Follow-up */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 avoid-break">
                      {p.advice && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                          <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Advice</div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.advice}</p>
                        </div>
                      )}
                      {p.followUpDate && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                          <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Calendar size={12} /> Follow-up Date
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{new Date(p.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          {p.followUpNotes && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{p.followUpNotes}</p>}
                        </div>
                      )}
                    </div>

                    {/* Footer: QR Code & Signature */}
                    <div className="flex justify-between items-end border-t border-slate-200 pt-8 mt-12 avoid-break">
                      <div className="flex items-end gap-6">
                        <div className="text-center">
                          <QRCodeSVG value={`https://tshastho.com/verify/rx/${p.prescriptionNo}`} size={80} level="M" className="opacity-80" />
                          <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">Scan to Verify</div>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1 mb-2">
                          <p>Prescription No: <span className="font-mono text-slate-600 font-semibold">{p.prescriptionNo}</span></p>
                          <p>Generated on: {new Date(p.createdAt).toLocaleString('en-GB')}</p>
                          <p className="text-[10px] mt-2 text-slate-400">This is a digitally generated prescription.</p>
                        </div>
                      </div>
                      <div className="text-center w-48">
                        {doc?.signatureUrl ? (
                          <div className="h-16 flex items-end justify-center mb-1">
                            <img src={doc.signatureUrl} alt="Signature" className="max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-16 w-full mb-1"></div>
                        )}
                        <div className="border-t border-slate-400 w-full mb-1"></div>
                        <div className="text-xs font-bold text-slate-800 tracking-wider">{doc?.name || "Doctor"}</div>
                        <div className="text-[10px] text-slate-500">Doctor's Signature</div>
                      </div>
                    </div>

                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pharmacy Picker Modal (Hidden on Print) */}
      {showPharmacyPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Select Pharmacy</h2>
                <p className="text-xs text-slate-500 mt-1">Send this prescription directly to a pharmacy.</p>
              </div>
              <button onClick={() => setShowPharmacyPicker(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {sendMessage && <p className="text-sm text-center text-emerald-600 bg-emerald-50 p-2 rounded-lg font-medium">{sendMessage}</p>}
              {pharmacies.length === 0 ? (
                <div className="text-center py-8">
                  <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No pharmacies available right now.</p>
                </div>
              ) : (
                pharmacies.map((ph: any) => (
                  <button key={ph.id} onClick={() => sendToPharmacy(ph.id)} disabled={sending}
                    className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 p-4 rounded-xl transition-all disabled:opacity-50">
                    <div className="font-bold text-slate-800">{ph.shopName}</div>
                    <div className="text-xs text-slate-500 mt-1">{ph.address}, {ph.area}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
