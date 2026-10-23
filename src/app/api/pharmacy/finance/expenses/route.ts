import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { recordExpense } from '@/lib/pharmacy/ledger';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const createSchema = z.object({
  category: z.enum(['RENT', 'SALARY', 'UTILITY', 'TRANSPORT', 'PURCHASE', 'MAINTENANCE', 'MARKETING', 'TAX', 'MISC']),
  amount: z.coerce.number().positive(),
  description: z.string().min(2),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
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
  const category = url.searchParams.get('category');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: any = { pharmacyId };
  if (category) where.category = category;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) where.expenseDate.lte = new Date(to);
  }

  const [expenses, summary] = await Promise.all([
    prisma.pharmacyExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take: 200,
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.pharmacyExpense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return NextResponse.json({ success: true, expenses, summary, total });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const expense = await prisma.pharmacyExpense.create({
      data: {
        pharmacyId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        notes: data.notes || null,
        receiptUrl: data.receiptUrl || null,
        createdById: user.id,
        status: 'APPROVED',
      },
    });

    // Auto ledger entry
    try {
      await recordExpense({
        pharmacyId,
        expenseId: expense.id,
        description: `${data.category}: ${data.description}`,
        amount: data.amount,
        createdById: user.id,
      });
    } catch (ledgerErr) {
      console.error('[EXPENSE_LEDGER]', ledgerErr);
    }

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[EXPENSE_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create expense', 500);
  }
}
