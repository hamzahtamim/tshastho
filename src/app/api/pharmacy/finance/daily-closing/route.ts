import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  closingDate: z.string(),
  openingCash: z.coerce.number().min(0).default(0),
  closingCash: z.coerce.number().min(0),
  notes: z.string().optional(),
});

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 30), 90);

  const closings = await prisma.dailyClosing.findMany({
    where: { pharmacyId },
    orderBy: { closingDate: 'desc' },
    take: limit,
    include: { closedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, closings });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const dayStart = new Date(data.closingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.dailyClosing.findFirst({
      where: { pharmacyId, closingDate: dayStart },
    });
    if (existing) {
      return errorResponse(ErrorCodes.CONFLICT, 'Closing already exists for this date', 409);
    }

    const [orderAgg, posAgg, posCashAgg, expenseAgg, purchaseAgg] = await Promise.all([
      prisma.order.aggregate({
        where: { pharmacyId, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { finalAmount: true },
        _count: { _all: true },
      }),
      prisma.posSale.aggregate({
        where: { pharmacyId, createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.posSale.aggregate({
        where: {
          pharmacyId,
          createdAt: { gte: dayStart, lte: dayEnd },
          paymentMethod: 'CASH',
        },
        _sum: { totalAmount: true },
      }),
      prisma.pharmacyExpense.aggregate({
        where: { pharmacyId, expenseDate: { gte: dayStart, lte: dayEnd }, status: 'APPROVED' },
        _sum: { amount: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: { pharmacyId, receivedDate: { gte: dayStart, lte: dayEnd } },
        _sum: { totalAmount: true },
      }),
    ]);

    const orderSum = orderAgg?._sum || {};
    const posSum = posAgg?._sum || {};
    const posCashSum = posCashAgg?._sum || {};
    const expenseSum = expenseAgg?._sum || {};
    const purchaseSum = purchaseAgg?._sum || {};

    const totalSales = Number(orderSum.finalAmount || 0);
    const totalPosSales = Number(posSum.totalAmount || 0);
    const totalCashSales = Number(posCashSum.totalAmount || 0);
    const totalExpenses = Number(expenseSum.amount || 0);
    const totalPurchases = Number(purchaseSum.totalAmount || 0);

    const totalCashIn = totalCashSales;
    const totalCashOut = totalExpenses + totalPurchases;
    const expectedCash = data.openingCash + totalCashIn - totalCashOut;
    const difference = data.closingCash - expectedCash;

    const closing = await prisma.dailyClosing.create({
      data: {
        pharmacyId,
        closingDate: dayStart,
        status: 'SUBMITTED',
        openingCash: data.openingCash,
        closingCash: data.closingCash,
        expectedCash,
        difference,
        totalSales,
        totalPosSales,
        totalExpenses,
        totalPurchases,
        totalCashIn,
        totalCashOut,
        netCashFlow: totalCashIn - totalCashOut,
        orderCount: orderAgg?._count?._all || 0,
        posSaleCount: posAgg?._count?._all || 0,
        notes: data.notes || null,
        closedById: user.id,
      },
    });

    return NextResponse.json({ success: true, closing }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[DAILY_CLOSING]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to close day', 500);
  }
}
