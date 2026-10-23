import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getLedgerSummary } from '@/lib/pharmacy/ledger';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

function generateSettlementNumber(seq: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `SET-${y}${m}-${String(seq).padStart(4, '0')}`;
}

const schema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  notes: z.string().optional(),
});

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const settlements = await prisma.settlementRequest.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ success: true, settlements });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);

    if (periodStart >= periodEnd) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid period range', 400);
    }

    // Get ledger summary for period
    const summary = await getLedgerSummary(pharmacyId, periodStart, periodEnd);

    const grossSales = summary.byType.SALE?.credit + summary.byType.POS_SALE?.credit || 0;
    const totalExpenses = summary.byType.EXPENSE?.debit || 0;
    const totalPurchases = summary.byType.PURCHASE?.debit || 0;

    // Commission: configurable (default 0% for now, use platform setting)
    const commissionSetting = await prisma.systemSetting.findUnique({ where: { key: 'platform_commission_percent' } });
    const commissionRate = commissionSetting ? parseFloat(commissionSetting.value) : 0;
    const commissionAmount = (grossSales * commissionRate) / 100;

    const netPayable = grossSales - commissionAmount;

    // Count for sequence
    const count = await prisma.settlementRequest.count({ where: { pharmacyId } });
    const requestNumber = generateSettlementNumber(count + 1);

    const settlement = await prisma.settlementRequest.create({
      data: {
        requestNumber,
        pharmacyId,
        status: "REQUESTED",
        periodStart,
        periodEnd,
        grossSales,
        commissionAmount,
        refundAmount: 0,
        netPayable,
        requestedById: user.id,
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ success: true, settlement, summary }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[SETTLEMENT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create settlement', 500);
  }
}
