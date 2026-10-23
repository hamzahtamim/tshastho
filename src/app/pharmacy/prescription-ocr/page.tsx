"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ScanLine, Upload, Loader2, CheckCircle, AlertCircle, Plus, X, Save } from "lucide-react";

export default function PrescriptionOcrPage() {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    setJob(null);
    setItems([]);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (res.ok && data.url) setImageUrl(data.url);
      else setMessage("Upload failed");
    } catch { setMessage("Upload error"); }
    setUploading(false);
  };

  const handleProcess = async () => {
    if (!imageUrl) return;
    setProcessing(true);
    setMessage("");
    try {
      const res = await fetch("/api/pharmacy/prescription-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      setProcessing(false);
      if (res.ok) {
        setJob(data.job);
        const extractedItems = (data.job.extractedItems as any[]) || [];
        if (extractedItems.length > 0) {
          setItems(extractedItems.map(i => ({ medicineName: i.medicineName || "", strength: i.strength || "", frequency: "", duration: "" })));
        } else {
          setItems([{ medicineName: "", strength: "", frequency: "", duration: "" }]);
        }
      } else setMessage(data.message || "Failed");
    } catch (err) {
      setProcessing(false);
      setMessage(err.message || "Failed");
    }
  };

  const addItem = () => setItems([...items, { medicineName: "", strength: "", frequency: "", duration: "" }]);
  const removeItem = (i: number) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  const updateItem = (i: number, field: string, value: string) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const saveToPrescription = () => {
    const valid = items.filter(i => i.medicineName.trim());
    if (valid.length === 0) { setMessage("Add at least one medicine"); return; }
    localStorage.setItem("ocr_extracted_items", JSON.stringify(valid));
    setMessage("✅ Medicines saved! Go to New Prescription to use them.");
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <ScanLine className="text-blue-600" size={22} />
        <h1 className="text-xl font-bold text-slate-800">Prescription OCR</h1>
      </div>

      <p className="text-xs text-slate-500 mb-4">Upload a prescription image and extract medicines.</p>

      {message && <p className="mb-3 text-sm text-center text-blue-600">{message}</p>}

      {!imagePreview ? (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-400 bg-white">
          <Upload size={24} className="text-slate-400 mb-2" />
          <span className="text-sm text-slate-500">{uploading ? "Uploading..." : "Click to upload prescription"}</span>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>
      ) : (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-4">
          <img src={imagePreview} alt="Rx" className="w-full rounded-xl border border-slate-200 max-h-72 object-contain bg-slate-50" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setImagePreview(""); setImageUrl(""); setJob(null); setItems([]); }}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium">Change</button>
            {!job && (
              <button onClick={handleProcess} disabled={processing || !imageUrl}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                {processing ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><ScanLine size={14} /> Extract</>}
              </button>
            )}
          </div>
        </div>
      )}

      {job && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            {job.status === "COMPLETED" ? (
              <><CheckCircle className="text-green-600" size={16} /> <span className="text-sm font-medium text-green-700">Extracted {items.length} items</span></>
            ) : (
              <><AlertCircle className="text-amber-600" size={16} /> <span className="text-sm font-medium text-amber-700">Manual entry required</span></>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-600">Review Medicines</label>
              <button onClick={addItem} className="text-xs text-blue-600 flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="bg-slate-50 p-2 rounded-xl">
                  <div className="flex gap-2 mb-1">
                    <input value={item.medicineName} onChange={(e) => updateItem(i, "medicineName", e.target.value)}
                      placeholder="Medicine name" className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
                    {items.length > 1 && <button onClick={() => removeItem(i)} className="p-1 text-red-500"><X size={14} /></button>}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <input value={item.strength} onChange={(e) => updateItem(i, "strength", e.target.value)} placeholder="Strength" className="px-2 py-1 border border-slate-200 rounded text-[11px]" />
                    <input value={item.frequency} onChange={(e) => updateItem(i, "frequency", e.target.value)} placeholder="1+0+1" className="px-2 py-1 border border-slate-200 rounded text-[11px]" />
                    <input value={item.duration} onChange={(e) => updateItem(i, "duration", e.target.value)} placeholder="7 days" className="px-2 py-1 border border-slate-200 rounded text-[11px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveToPrescription}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <Save size={16} /> Save for Prescription
          </button>
        </div>
      )}
    </div>
  );
}
