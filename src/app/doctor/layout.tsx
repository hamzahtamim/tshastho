import DoctorNav from "@/components/doctor/DoctorNav";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DoctorNav />
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
