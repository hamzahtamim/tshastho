import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

const schema = z.object({
  customerId: z.string().min(1),
  type: z.enum(['SALE_ON_CREDIT', 'PAYMENT_RECEIVED', 'ADJUSTMENT', 'WRITE_OFF']),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const customerId = url.searchParams.get('customerId');

  const where: any = { pharmacyId };
  if (customerId) where.customerId = customerId;

  const entries = await prisma.customerCreditLedger.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  // Compute balances per customer
  const balances: Record<string, number> = {};
  const allEntries = await prisma.customerCreditLedger.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: 'desc' },
    select: { customerId: true, balance: true, createdAt: true },
  });
  for (const e of allEntries) {
    if (!(e.customerId in balances)) {
      balances[e.customerId] = Number(e.balance);
    }
  }

  return NextResponse.json({ success: true, entries, balances });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Get last balance
    const last = await prisma.customerCreditLedger.findFirst({
      where: { pharmacyId, customerId: data.customerId },
      orderBy: { createdAt: 'desc' },
      select: { balance: true },
    });
    const prevBalance = last?.balance ? Number(last.balance) : 0;

    // Compute new balance
    let delta = 0;
    if (data.type === 'SALE_ON_CREDIT') delta = data.amount;
    else if (data.type === 'PAYMENT_RECEIVED') delta = -data.amount;
    else if (data.type === 'WRITE_OFF') delta = -data.amount;
    else if (data.type === 'ADJUSTMENT') delta = data.amount;

    const newBalance = prevBalance + delta;

    const entry = await prisma.customerCreditLedger.create({
      data: {
        pharmacyId,
        customerId: data.customerId,
        type: data.type as any,
        amount: data.amount,
        balance: newBalance,
        description: data.description || null,
        paymentMethod: data.paymentMethod || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[CREDIT_ENTRY]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
