"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";

export default function BulkImportPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleExport = () => {
    window.location.href = "/api/pharmacy/medicines/export";
  };

  const parseCsv = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur);
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.trim());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      const obj: any = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx]?.trim() || ''; });
      rows.push(obj);
    }
    return rows;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError("");

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setError("CSV is empty or invalid");
        setUploading(false);
        return;
      }

      const res = await fetch("/api/pharmacy/medicines/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows, mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || "Import failed");
      }
    } catch (err) {
      setError("Failed to read file");
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="text-blue-600" size={22} />
        <h1 className="text-xl font-bold text-slate-800">Bulk Import / Export</h1>
      </div>

      {/* Export */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Download size={16} /> Export All Medicines
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Download all medicines as CSV. Edit in Excel/Sheets, then re-import.
        </p>
        <button onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Download size={16} /> Download CSV
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Upload size={16} /> Import Medicines
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Upload a CSV with columns: <code className="bg-slate-100 px-1 rounded text-[10px]">name, brand, genericName, category, unit, purchasePrice, sellingPrice, stock, stripSize, boxSize, manufacturer</code>
        </p>

        <div className="mb-3">
          <label className="text-xs font-medium text-slate-600 mb-2 block">Duplicate handling</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("skip")}
              className={`py-2 rounded-xl text-xs font-medium border ${
                mode === "skip" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"
              }`}>
              Skip existing
            </button>
            <button onClick={() => setMode("update")}
              className={`py-2 rounded-xl text-xs font-medium border ${
                mode === "update" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"
              }`}>
              Update existing
            </button>
          </div>
        </div>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400">
          <Upload size={20} className="text-slate-400 mb-1" />
          <span className="text-sm text-slate-500">{uploading ? "Uploading..." : "Click to select CSV file"}</span>
          <span className="text-[10px] text-slate-400 mt-1">Max 2000 rows</span>
          <input type="file" accept=".csv" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={18} />
            <span className="font-bold text-green-800">Import Successful</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2 rounded-lg">
              <div className="text-slate-500">Created</div>
              <div className="font-bold text-green-700">{result.summary.created}</div>
            </div>
            <div className="bg-white p-2 rounded-lg">
              <div className="text-slate-500">Updated</div>
              <div className="font-bold text-blue-700">{result.summary.updated}</div>
            </div>
            <div className="bg-white p-2 rounded-lg">
              <div className="text-slate-500">Skipped</div>
              <div className="font-bold text-slate-700">{result.summary.skipped}</div>
            </div>
            <div className="bg-white p-2 rounded-lg">
              <div className="text-slate-500">Errors</div>
              <div className="font-bold text-red-700">{result.summary.errors}</div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-red-700 font-medium">View errors</summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e: any, i: number) => (
                  <div key={i} className="bg-white p-2 rounded text-red-600">
                    Row {e.row}: {e.message}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Sample template */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800">
        <strong>CSV Format Example:</strong>
        <pre className="bg-white p-2 rounded mt-2 overflow-x-auto text-[10px] whitespace-pre">
name,brand,genericName,category,unit,purchasePrice,sellingPrice,stock,stripSize,boxSize,manufacturer
Napa,Square,Paracetamol,Analgesic,piece,0.5,1,500,10,100,Square Pharmaceuticals
Seclo,Eskay,Omeprazole,Antacid,piece,3,5,200,10,100,Eskayef
        </pre>
      </div>
    </div>
  );
}
