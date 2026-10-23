import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { generateVatReport } from '@/lib/tax/vat';
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
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const reports = await prisma.vatReport.findMany({
    where: { pharmacyId },
    orderBy: { month: 'desc' },
    take: 60,
    include: { generatedBy: { select: { name: true } } },
  });

  return NextResponse.json({ success: true, reports });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const report = await generateVatReport({
      pharmacyId,
      month: data.month,
      userId: user.id,
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[VAT_REPORT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
