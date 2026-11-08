export default function InteractionWarning({ warnings, onClose, onAcknowledge }: any) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl">
        <h2 className="text-red-600 font-bold text-lg mb-2">Drug Interaction Warning</h2>
        <ul className="list-disc pl-5 mb-5 text-sm text-slate-700 space-y-1">
          {warnings.map((w: any, i: number) => <li key={i}>{w.message || w}</li>)}
        </ul>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
          <button onClick={onAcknowledge} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">Proceed Anyway</button>
        </div>
      </div>
    </div>
  );
}
