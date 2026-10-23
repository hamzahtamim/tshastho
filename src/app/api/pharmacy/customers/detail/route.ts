import { NextResponse } from "next/server";
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const { email, customerId } = await req.json();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    if (!pharmacy) return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });

    // Customer info
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });

    if (!customer) return NextResponse.json({ message: "Customer not found" }, { status: 404 });

    // All orders of this customer from this pharmacy
    const orders = await prisma.order.findMany({
      where: { patientId: customerId, pharmacyId: pharmacy.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    let totalSpent = 0, totalPaid = 0, totalDue = 0, totalProfit = 0;
    let deliveredCount = 0, cancelledCount = 0;
    const favMedicineMap: any = {};

    for (const order of orders) {
      if (order.status === "DELIVERED") {
        deliveredCount++;
        totalSpent += parseFloat(order.finalAmount.toString());
        totalPaid += parseFloat(order.paidAmount.toString());
        totalDue += parseFloat(order.dueAmount.toString());
        totalProfit += parseFloat(order.netProfit.toString());
      }
      if (order.status === "REJECTED" || order.status === "CANCELLED") cancelledCount++;

      // Track medicines
      for (const item of order.items) {
        const key = item.medicineName;
        if (!favMedicineMap[key]) favMedicineMap[key] = { name: key, count: 0, totalQty: 0 };
        favMedicineMap[key].count++;
        favMedicineMap[key].totalQty += item.quantity;
      }
    }

    // Top 5 medicines
    const favoriteMedicines = Object.values(favMedicineMap)
      .sort((a: any, b: any) => b.totalQty - a.totalQty)
      .slice(0, 5);

    // Tag
    let tag = "NEW";
    if (deliveredCount >= 10 || totalSpent >= 5000) tag = "VIP";
    else if (deliveredCount >= 3 || totalSpent >= 1000) tag = "REGULAR";

    // Days info
    const firstOrder = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
    const lastOrder = orders.length > 0 ? orders[0].createdAt : null;
    const daysSinceLast = lastOrder ? Math.floor((Date.now() - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Dues
    const dues = await prisma.due.findMany({
      where: { patientId: customerId, pharmacyId: pharmacy.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customer,
      orders,
      stats: {
        totalOrders: orders.length,
        deliveredCount,
        cancelledCount,
        totalSpent,
        totalPaid,
        totalDue,
        totalProfit,
        tag,
        daysSinceLast,
        firstOrder,
        lastOrder,
      },
      favoriteMedicines,
      dues,
    }, { status: 200 });
  } catch (error) {
    console.error("Customer detail error:", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
