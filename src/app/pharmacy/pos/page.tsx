"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInventorySync } from "@/hooks/useInventorySync";
import { submitPosSale } from "@/lib/offline/sale-submit";
import VoiceInputButton from "@/components/pharmacy/VoiceInputButton";
import SubstituteModal from "@/components/pharmacy/SubstituteModal";
import InteractionWarning from "@/components/pharmacy/InteractionWarning";
import SplitPaymentModal from "@/components/pharmacy/SplitPaymentModal";
import OfflineIndicator from "@/components/pharmacy/OfflineIndicator";
import BarcodeScannerListener from "@/components/pharmacy/BarcodeScannerListener";
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, X, Printer, 
  Wallet, CheckCircle, Barcode, CreditCard, UserPlus, AlertTriangle
} from "lucide-react";

interface CartItem {
  medicineId: string;
  name: string;
  brand?: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
  stock: number;
  discount: number;
}

export default function POSPage() {
  const { user } = useAuth();
  const { tick: stockSyncTick } = useInventorySync();
  
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [shift, setShift] = useState<any>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showSubstitutes, setShowSubstitutes] = useState<{id: string; name: string} | null>(null);
  const [interactionWarnings, setInteractionWarnings] = useState<any[]>([]);
  const [showInteractionWarning, setShowInteractionWarning] = useState(false);
  
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyChecked, setLoyaltyChecked] = useState(false);
  
  const searchTimer = useRef<any>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcode, setShowBarcode] = useState(false);

  const loadShift = async () => {
    const res = await fetch("/api/pharmacy/pos/shift/current", { credentials: "include" });
    const data = await res.json();
    setShift(data.shift || null);
  };

  useEffect(() => { if (user) loadShift(); }, [user, stockSyncTick]);

  useEffect(() => {
    const onScan = (e: Event) => {
      const code = (e as CustomEvent).detail?.code;
      if (!code) return;
      fetch(`/api/pharmacy/pos/scan?barcode=${encodeURIComponent(code)}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => { if (d.success && d.medicine) addToCart(d.medicine); })
        .catch((err) => console.error('[SCAN]', err));
    };
    window.addEventListener('tshastho:barcode-scanned', onScan);
    return () => window.removeEventListener('tshastho:barcode-scanned', onScan);
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (search.length < 2) { setResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/pharmacy/pos/medicine-search?q=${encodeURIComponent(search)}`, { credentials: "include" });
      const data = await res.json();
      setResults(data.medicines || []);
      setSearching(false);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const addToCart = (med: any) => {
    const existing = cart.find(c => c.medicineId === med.id);
    if (existing) {
      if (existing.quantity >= med.stock) { setShowSubstitutes({ id: med.id, name: med.name }); return; }
      setCart(cart.map(c => c.medicineId === med.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        medicineId: med.id, name: med.name, brand: med.brand,
        unitPrice: Number(med.sellingPrice), purchasePrice: Number(med.purchasePrice),
        quantity: 1, stock: med.stock, discount: 0,
      }]);
    }
    setSearch(""); setResults([]);
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const res = await fetch(`/api/pharmacy/pos/scan?barcode=${encodeURIComponent(barcodeInput.trim())}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      addToCart(data.medicine);
      setBarcodeInput(""); setShowBarcode(false);
    } else {
      alert("Barcode not found"); setBarcodeInput("");
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.medicineId !== id) return c;
      const nq = c.quantity + delta;
      if (nq <= 0) return c;
      if (nq > c.stock) return { ...c, quantity: c.stock };
      return { ...c, quantity: nq };
    }));
  };

  const removeItem = (id: string) => setCart(cart.filter(c => c.medicineId !== id));

  const subtotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const loyaltyDiscountAmount = Math.min(loyaltyPoints, loyaltyInfo?.points || 0);
  const total = Math.max(0, subtotal - discountAmount - loyaltyDiscountAmount);
  const change = Math.max(0, paidAmount - total);
  const due = Math.max(0, total - paidAmount);

  const checkLoyalty = async (phone: string) => {
    setLoyaltyChecked(false); setLoyaltyInfo(null); setLoyaltyPoints(0);
    if (!phone || phone.length < 6) return;
    try {
      const res = await fetch(`/api/pharmacy/pos/customer-loyalty?phone=${encodeURIComponent(phone)}`, { credentials: "include" });
      const data = await res.json();
      if (data.loyalty) setLoyaltyInfo(data.loyalty);
    } catch {}
    setLoyaltyChecked(true);
  };

  const handleVoiceResult = (result: { medicineName: string; quantity: number; unit?: string }) => {
    setSearch(result.medicineName);
    setTimeout(() => {
      if (results.length > 0) {
        const med = results[0];
        addToCart(med);
        for (let i = 1; i < result.quantity; i++) { setTimeout(() => addToCart(med), 50 * i); }
      } else { alert("No medicine found for: " + result.medicineName); }
    }, 500);
  };

  const handleSubstituteSelect = (sub: any) => {
    addToCart({ id: sub.id, name: sub.name, brand: sub.brand, sellingPrice: sub.sellingPrice, purchasePrice: 0, stock: sub.stock });
    setShowSubstitutes(null);
  };

  const checkInteractions = async () => {
    const names = cart.map(c => c.name);
    if (names.length < 2) return [];
    try {
      const res = await fetch("/api/pharmacy/interactions/check", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ medicineNames: names }),
      });
      const data = await res.json();
      return data.warnings || [];
    } catch { return []; }
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    const warnings = await checkInteractions();
    if (warnings.length > 0) { setInteractionWarnings(warnings); setShowInteractionWarning(true); setSaving(false); return; }
    
    const res = await submitPosSale({
      items: cart.map(c => ({ medicineId: c.medicineId, quantity: c.quantity, unitPrice: c.unitPrice, discount: c.discount })),
      customerName: customerName || undefined, customerPhone: customerPhone || undefined,
      discountAmount, paymentMethod, paidAmount: paymentMethod === "DUE" ? 0 : (paidAmount || total),
      notes: notes || undefined, loyaltyPointsToRedeem: loyaltyPoints,
    });
    const data: any = await res.json();
    setSaving(false);
    if (res.ok) {
      setShowReceipt(data.receipt); setCart([]); setCustomerName(""); setCustomerPhone("");
      setDiscountAmount(0); setPaidAmount(0); setNotes(""); setPaymentMethod("CASH");
      setLoyaltyInfo(null); setLoyaltyPoints(0); setShowPayment(false); loadShift();
    } else { alert(data.message || "Sale failed"); }
  };

  const handleSplitConfirm = async (splits: any[], notes: string) => {
    if (cart.length === 0) return;
    setSaving(true);
    const res = await submitPosSale({
      items: cart.map(c => ({ medicineId: c.medicineId, quantity: c.quantity, unitPrice: c.unitPrice, discount: c.discount })),
      customerName: customerName || undefined, customerPhone: customerPhone || undefined,
      discountAmount, paymentMethod: "MIXED", paidAmount: splits.filter(s => s.method !== "CREDIT" && s.method !== "DUE").reduce((a, b) => a + b.amount, 0),
      notes: notes || undefined, loyaltyPointsToRedeem: loyaltyPoints, splits,
    });
    const data: any = await res.json();
    setSaving(false);
    if (res.ok) {
      setShowReceipt(data.receipt); setCart([]); setCustomerName(""); setCustomerPhone("");
      setDiscountAmount(0); setPaidAmount(0); setNotes(""); setShowSplitModal(false); setShowPayment(false); loadShift();
    } else { alert(data.message || "Sale failed"); }
  };

  const handleOpenShift = async () => {
    const res = await fetch("/api/pharmacy/pos/shift/open", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ openingCash }),
    });
    const data = await res.json();
    if (res.ok) { setShift(data.shift); setShowShiftModal(false); setOpeningCash(0); }
  };

  const handleCloseShift = async () => {
    const res = await fetch("/api/pharmacy/pos/shift/close", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ closingCash }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Shift closed.\nExpected: ৳${data.shift.expectedCash}\nCounted: ৳${data.shift.closingCash}\nDifference: ৳${data.shift.difference}`);
      setShift(null); setShowShiftModal(false); setClosingCash(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <ShoppingCart className="text-indigo-600" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">POS Terminal</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Point of Sale</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {shift ? (
              <>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Shift Open
                </span>
                <button onClick={() => setShowShiftModal(true)} className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors">
                  Close Shift
                </button>
              </>
            ) : (
              <button onClick={() => setShowShiftModal(true)} className="text-xs px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 transition-colors">
                Open Shift
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-12 gap-6">
        
        {/* Left: Search & Cart */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          
          {/* Premium Search Bar */}
          <div className="relative z-20">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={22} />
            </div>
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine by name, brand, generic..." 
              className="w-full pl-12 pr-24 py-4 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl text-base font-medium shadow-sm outline-none transition-all placeholder:text-slate-400 text-slate-800" 
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button type="button" onClick={() => setShowBarcode(true)} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors" title="Scan Barcode">
                <Barcode size={20} />
              </button>
              <VoiceInputButton onParsed={handleVoiceResult} />
            </div>

            {/* Search Results Dropdown */}
            {search.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                {searching ? (
                  <div className="p-6 text-center text-slate-500 text-sm animate-pulse">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No medicines found for "{search}"</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {results.map((m) => (
                      <button key={m.id} onClick={() => { addToCart(m); setSearch(""); }} className="w-full p-4 text-left hover:bg-slate-50 flex justify-between items-center group transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{m.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{m.brand || m.genericName} • Stock: <span className={m.stock < 10 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>{m.stock}</span></div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-slate-800">৳{Number(m.sellingPrice).toFixed(2)}</div>
                          <div className="text-[10px] text-indigo-500 font-semibold mt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={12}/> Add</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                Cart Items <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{cart.length}</span>
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Clear All</button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart size={32} className="text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-700 mb-1">Cart is empty</h3>
                <p className="text-sm text-slate-500">Search or scan a medicine to start billing.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.medicineId} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">৳{item.unitPrice.toFixed(2)} / unit</div>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
                      <button onClick={() => updateQty(item.medicineId, -1)} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                      <button onClick={() => updateQty(item.medicineId, 1)} disabled={item.quantity >= item.stock} className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:text-emerald-500 disabled:opacity-50 transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="text-right w-20 shrink-0">
                      <div className="font-bold text-slate-800 text-sm">৳{(item.unitPrice * item.quantity).toFixed(2)}</div>
                    </div>

                    <button onClick={() => removeItem(item.medicineId)} className="w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Checkout */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-4 sm:p-5 sticky top-24">
            <h2 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2">
              <Wallet size={18} className="text-indigo-600"/> Payment Summary
            </h2>
            
            <div className="space-y-3 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">৳{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Discount (৳)</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">৳</span>
                  <input type="number" min={0} value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)} className="w-24 pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-right font-bold text-red-500 outline-none focus:border-indigo-400 bg-white" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-end">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-black text-2xl text-indigo-600">৳{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <UserPlus size={14}/> Customer Info (Optional)
              </div>
              <input value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); if(e.target.value.length===11) checkLoyalty(e.target.value); }} placeholder="01XXXXXXXXX" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-400 outline-none transition-colors" />
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-400 outline-none transition-colors" />
            </div>

            <button onClick={() => setShowPayment(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group">
              <CreditCard size={20} className="group-hover:scale-110 transition-transform"/> Checkout
            </button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="font-bold text-xl text-slate-800 mb-5 text-center">{shift ? "Close Shift" : "Open Shift"}</h2>
            {shift ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
                  <div className="flex justify-between text-slate-600"><span>Total Sales</span><span className="font-bold text-slate-800">৳{Number(shift.totalSales).toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Cash Sales</span><span className="font-bold text-slate-800">৳{Number(shift.totalCash).toFixed(2)}</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Closing Cash Amount</label>
                  <input type="number" value={closingCash} onChange={(e) => setClosingCash(Number(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:bg-white outline-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowShiftModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors">Cancel</button>
                  <button onClick={handleCloseShift} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">Close Shift</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Opening Cash Amount</label>
                  <input type="number" value={openingCash} onChange={(e) => setOpeningCash(Number(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:bg-white outline-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowShiftModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors">Cancel</button>
                  <button onClick={handleOpenShift} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors">Open Shift</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="font-bold text-lg text-slate-800">Complete Payment</h2>
              <button onClick={() => setShowPayment(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200"><X size={18} /></button>
            </div>
            
            <div className="p-5 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {["CASH", "CARD", "BKASH", "NAGAD", "DUE", "WALLET"].map((m) => (
                    <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${paymentMethod === m ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== "DUE" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount Received</label>
                  <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-black text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all" placeholder="0.00" />
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-sm text-slate-600"><span>Total Payable</span><span className="font-bold text-slate-800">৳{total.toFixed(2)}</span></div>
                {paymentMethod !== "DUE" && (
                  <>
                    <div className="flex justify-between text-sm text-slate-600"><span>Change Return</span><span className="font-bold text-emerald-600">৳{change.toFixed(2)}</span></div>
                    {due > 0 && <div className="flex justify-between text-sm text-red-600"><span>Due Amount</span><span className="font-bold">৳{due.toFixed(2)}</span></div>}
                  </>
                )}
              </div>

              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add note (optional)" rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none" />

              <div className="space-y-3 pt-2">
                <button onClick={() => { setShowPayment(false); setShowSplitModal(true); }} className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">Split Payment</button>
                <button onClick={completeSale} disabled={saving} className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> {saving ? "Processing..." : "Complete Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-emerald-600" size={32} />
              </div>
              <h2 className="font-bold text-xl text-slate-800">Sale Complete!</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">{showReceipt.saleNumber}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-4 space-y-2 text-sm mb-4 max-h-48 overflow-y-auto">
              {showReceipt.items.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{i.qty} × {i.name}</span>
                  <span className="font-semibold">৳{Number(i.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between text-slate-600"><span>Total</span><span className="font-bold text-slate-800">৳{Number(showReceipt.total).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Paid</span><span className="font-bold text-slate-800">৳{Number(showReceipt.paid).toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Change</span><span className="font-bold">৳{Number(showReceipt.change).toFixed(2)}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"><Printer size={18}/> Print</button>
              <button onClick={() => setShowReceipt(null)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">New Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {showBarcode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Barcode className="text-indigo-600" size={28} />
              </div>
              <h2 className="font-bold text-lg text-slate-800">Scan Barcode</h2>
              <p className="text-sm text-slate-500 mt-1">Use scanner or type barcode number</p>
            </div>
            
            <form onSubmit={handleBarcodeScan} className="space-y-4">
              <input autoFocus value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Scan or type barcode..." className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-mono text-lg focus:bg-white outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowBarcode(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Additional Modals (from your old code) */}
      {showInteractionWarning && <InteractionWarning warnings={interactionWarnings} onClose={() => setShowInteractionWarning(false)} onAcknowledge={() => { setShowInteractionWarning(false); setInteractionWarnings([]); }} />}
      {showSubstitutes && <SubstituteModal medicineId={showSubstitutes.id} medicineName={showSubstitutes.name} onSelect={handleSubstituteSelect} onClose={() => setShowSubstitutes(null)} />}
      {showSplitModal && <SplitPaymentModal total={total} customerName={customerName || undefined} customerPhone={customerPhone || undefined} onConfirm={handleSplitConfirm} onClose={() => setShowSplitModal(false)} processing={saving} />}

    </div>
  );
}
