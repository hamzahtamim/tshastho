import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getCurrenciesWithRates } from '@/lib/currency';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(2).max(5).toUpperCase(),
  name: z.string().min(2),
  symbol: z.string().min(1).max(5),
  isActive: z.boolean().default(true),
  isBase: z.boolean().default(false),
});

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const currencies = await getCurrenciesWithRates();
  return NextResponse.json({ success: true, currencies });
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.currency.findUnique({ where: { code: data.code } });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Currency already exists', 409);

    // If setting base, unset others
    if (data.isBase) {
      await prisma.currency.updateMany({ data: { isBase: false } });
    }

    const currency = await prisma.currency.create({ data });
    return NextResponse.json({ success: true, currency }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
