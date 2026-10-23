import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  fromCode: z.string().min(2),
  toCode: z.string().min(2),
  rate: z.coerce.number().positive(),
});

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  const rates = await prisma.exchangeRate.findMany({
    where: { isActive: true },
    orderBy: { effectiveFrom: 'desc' },
    include: {
      fromCurrency: { select: { code: true, symbol: true, name: true } },
      toCurrency: { select: { code: true, symbol: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json({ success: true, rates });
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [from, to] = await Promise.all([
      prisma.currency.findUnique({ where: { code: data.fromCode } }),
      prisma.currency.findUnique({ where: { code: data.toCode } }),
    ]);
    if (!from || !to) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Currency not found', 404);

    // Deactivate old rates
    await prisma.exchangeRate.updateMany({
      where: { fromCurrencyId: from.id, toCurrencyId: to.id, isActive: true },
      data: { isActive: false, effectiveTo: new Date() },
    });

    const rate = await prisma.exchangeRate.create({
      data: { fromCurrencyId: from.id, toCurrencyId: to.id, rate: data.rate, source: 'MANUAL' },
    });

    return NextResponse.json({ success: true, rate }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
