import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';

// GET request: Owner dashboard chart data
export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    // FIX: URL থেকে 'days' প্যারামিটার রিড করা হচ্ছে
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    // ফার্মেসি খোঁজার লজিক (স্টাফ এবং ওনার দুইজনের জন্য)
    let pharmacy = null;
    if (user.parentPharmacyId) {
      pharmacy = await prisma.pharmacy.findUnique({ where: { id: user.parentPharmacyId } });
    }
    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    }
    if (!pharmacy) return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ===== 1. Daily Sales (Last N days) =====
    const orders = await prisma.order.findMany({
      where: {
        pharmacyId: pharmacy.id,
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      select: { finalAmount: true, totalAmount: true, status: true, createdAt: true },
    });

    const dailyMap: Record<string, { sales: number; orders: number; profit: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { sales: 0, orders: 0, profit: 0 };
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].sales += Number(o.finalAmount || o.totalAmount || 0);
        dailyMap[key].orders += 1;
      }
    }
    const dailySales = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ===== 2. Top 5 Medicines =====
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          pharmacyId: pharmacy.id,
          createdAt: { gte: startDate },
          status: { not: "CANCELLED" },
        },
      },
      select: { medicineName: true, quantity: true, unitPrice: true },
    });

    const medicineMap: Record<string, { qty: number; revenue: number }> = {};
    for (const it of orderItems) {
      const name = it.medicineName || "Unknown";
      if (!medicineMap[name]) medicineMap[name] = { qty: 0, revenue: 0 };
      medicineMap[name].qty += Number(it.quantity || 0);
      medicineMap[name].revenue += Number(it.quantity || 0) * Number(it.unitPrice || 0);
    }
    const topMedicines = Object.entries(medicineMap)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // ===== 3. Category-wise Sales =====
    const medicineNames = [...new Set(orderItems.map((i) => i.medicineName).filter(Boolean))];
    const medicineInfo = await prisma.medicine.findMany({
      where: { pharmacyId: pharmacy.id, name: { in: medicineNames as string[] } },
      select: { name: true, category: true },
    });
    
    const nameToCategory: Record<string, string> = {};
    for (const m of medicineInfo) {
      nameToCategory[m.name] = m.category || "Other";
    }

    const catMap: Record<string, number> = {};
    for (const it of orderItems) {
      const cat = nameToCategory[it.medicineName || ""] || "Other";
      catMap[cat] = (catMap[cat] || 0) + Number(it.quantity || 0) * Number(it.unitPrice || 0);
    }
    const categorySales = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ===== 4. Summary Cards =====
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todaySales = dailyMap[today]?.sales || 0;
    const weekSales = orders
      .filter((o) => o.createdAt >= weekAgo)
      .reduce((s, o) => s + Number(o.finalAmount || o.totalAmount || 0), 0);
    const monthSales = orders
      .filter((o) => o.createdAt >= monthStart)
      .reduce((s, o) => s + Number(o.finalAmount || o.totalAmount || 0), 0);

    return NextResponse.json({
      dailySales,
      topMedicines,
      categorySales,
      summary: {
        todaySales,
        weekSales,
        monthSales,
        totalOrders: orders.length,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Charts error:", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
