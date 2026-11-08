import { NextResponse } from "next/server";
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
        const user = await prisma.user.findFirst({ where: { email: auth.user.email }});
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    // Find pharmacy: own OR parent
    let pharmacy = null;
    if (user.parentPharmacyId) {
      pharmacy = await prisma.pharmacy.findFirst({ where: { id: user.parentPharmacyId } });
    }
    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    }
    if (!pharmacy) return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    const weekStart = new Date(todayStart);
    const dayOfWeek = todayStart.getDay();
    const diffToSat = dayOfWeek >= 6 ? 0 : dayOfWeek + 1;
    weekStart.setDate(weekStart.getDate() - diffToSat);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allOrders = await prisma.order.findMany({
      where: { pharmacyId: pharmacy.id, status: "DELIVERED" },
      include: { items: true },
    });

    const calculateStats = (start: Date, end?: Date) => {
      const filtered = allOrders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        if (t < start.getTime()) return false;
        if (end && t >= end.getTime()) return false;
        return true;
      });

      let revenue = 0, cost = 0, platformFee = 0, deliveryFee = 0, dueAmount = 0;
      for (const order of filtered) {
        revenue += parseFloat(order.totalAmount.toString());
        platformFee += parseFloat(order.platformFee.toString());
        deliveryFee += parseFloat(order.deliveryFee.toString());
        if (order.isDue) dueAmount += parseFloat(order.dueAmount.toString());
        for (const item of order.items) {
          cost += parseFloat(item.costPrice.toString());
        }
      }
      const netProfit = revenue - cost - platformFee;
      return { revenue, cost, platformFee, deliveryFee, netProfit, dueAmount, orderCount: filtered.length };
    };

    const today = calculateStats(todayStart);
    const yesterday = calculateStats(yesterdayStart, yesterdayEnd);
    const week = calculateStats(weekStart);
    const month = calculateStats(monthStart);
    const total = calculateStats(new Date(0));

    const dues = await prisma.due.findMany({ where: { pharmacyId: pharmacy.id, status: { not: "PAID" } } });
    const pendingOrders = await prisma.order.count({ where: { pharmacyId: pharmacy.id, status: "PENDING" } });
    const medicines = await prisma.medicine.findMany({
      where: { pharmacyId: pharmacy.id },
      select: { sellingPrice: true, purchasePrice: true, stock: true, expiryDate: true },
    });

    let totalDue = 0;
    for (const d of dues) {
      totalDue += parseFloat(d.amount.toString()) - parseFloat(d.paidAmount.toString());
    }

    let stockValue = 0, stockCost = 0;
    for (const m of medicines) {
      stockValue += parseFloat(m.sellingPrice.toString()) * m.stock;
      stockCost += parseFloat(m.purchasePrice.toString()) * m.stock;
    }

    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expired = 0, expiringSoon = 0;
    for (const m of medicines) {
      if (m.expiryDate) {
        const exp = new Date(m.expiryDate);
        if (exp < now) expired++;
        else if (exp <= thirtyDaysLater) expiringSoon++;
      }
    }

    const allOrdersList = await prisma.order.findMany({
      where: { pharmacyId: pharmacy.id },
      select: { patientId: true },
    });
    const customerCount = new Set(allOrdersList.map(o => o.patientId)).size;

    return NextResponse.json({
      today, yesterday, week, month, total,
      totalDue, pendingOrders,
      medicineCount: medicines.length,
      stockValue, stockCost,
      expired, expiringSoon,
      customerCount,
    }, { status: 200 });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
