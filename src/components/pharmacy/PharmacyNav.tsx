"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, Pill, History, Truck, ShoppingCart, 
  Users, UserCog, ClipboardList, DollarSign, Bell, Wallet, 
  FileText, RotateCcw, Building2, ArrowLeftRight, Shield, 
  Repeat, FileSpreadsheet, ShieldAlert, Trash2, BookOpen, 
  Barcode, Lightbulb, ScanLine, MessageSquare, BarChart3, Receipt, 
  Menu, X, ChevronRight, Package, AlertTriangle, LogOut, User
} from "lucide-react";

const NAV = [
  { href: "/pharmacy", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pharmacy/medicines", icon: Pill, label: "Medicines" },
  { href: "/pharmacy/medicines/bulk", icon: FileSpreadsheet, label: "Bulk" },
  { href: "/pharmacy/barcodes", icon: Barcode, label: "Barcodes" },
  { href: "/pharmacy/sms", icon: MessageSquare, label: "SMS" },
  { href: "/pharmacy/rx-requests", icon: FileText, label: "Rx Requests" },
  { href: "/pharmacy/tax-config", icon: Receipt, label: "Tax/VAT" },
  { href: "/pharmacy/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/pharmacy/audit", icon: Shield, label: "Audit" },
  { href: "/pharmacy/batches", icon: Package, label: "Batches" },
  { href: "/pharmacy/stock-alerts", icon: AlertTriangle, label: "Low Stock" },
  { href: "/pharmacy/refill-reminders", icon: Repeat, label: "Refills" },
  { href: "/pharmacy/narcotic-register", icon: ShieldAlert, label: "Narcotic" },
  { href: "/pharmacy/expiry-write-off", icon: Trash2, label: "Expiry" },
  { href: "/pharmacy/credit-ledger", icon: BookOpen, label: "Credit" },
  { href: "/pharmacy/payroll", icon: Wallet, label: "Payroll" },
  { href: "/pharmacy/stock-movements", icon: History, label: "Stock" },
  { href: "/pharmacy/suppliers", icon: Truck, label: "Suppliers" },
  { href: "/pharmacy/purchases", icon: ShoppingCart, label: "Purchases" },
  { href: "/pharmacy/pos", icon: ShoppingCart, label: "POS" },
  { href: "/pharmacy/orders", icon: ClipboardList, label: "Orders" },
  { href: "/pharmacy/customers", icon: Users, label: "Customers" },
  { href: "/pharmacy/staff", icon: UserCog, label: "Staff" },
  { href: "/pharmacy/dues", icon: DollarSign, label: "Dues" },
  { href: "/pharmacy/finance", icon: Wallet, label: "Finance" },
  { href: "/pharmacy/prescriptions", icon: FileText, label: "Rx Verify" },
  { href: "/pharmacy/returns", icon: RotateCcw, label: "Returns" },
  { href: "/pharmacy/branches", icon: Building2, label: "Branches" },
  { href: "/pharmacy/transfers", icon: ArrowLeftRight, label: "Transfers" },
  { href: "/pharmacy/dgda", icon: Shield, label: "DGDA" },
  { href: "/pharmacy/notifications", icon: Bell, label: "Notifications" },
];

export default function PharmacyNav({ pendingOrders = 0 }: { pendingOrders?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <>
      {/* Top Header with Logo & Menu Button */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/pharmacy" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Tshastho" width={120} height={30} className="object-contain" priority />
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-100">
            Pharmacy
          </span>
        </Link>
        
        <div className="flex items-center gap-2">
          <Link href="/pharmacy/notifications" className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center relative transition-colors">
            <Bell size={16} className="text-slate-600" />
            {pendingOrders > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            )}
          </Link>
          <Link href="/pharmacy/profile" className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() || "P"}
          </Link>
          <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-full transition-colors">
            <LogOut size={14} />
          </button>
          <button onClick={() => setIsOpen(true)} className="p-2 ml-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-md">
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Slide-out Drawer (Mobile & Desktop) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          
          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <Image src="/logo.png" alt="Tshastho" width={100} height={24} className="object-contain" />
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/pharmacy" && pathname.startsWith(item.href));
                
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
                      {item.label}
                    </div>
                    {active && <ChevronRight size={16} className="text-white/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
