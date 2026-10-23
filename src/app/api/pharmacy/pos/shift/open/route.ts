import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  openingCash: z.coerce.number().min(0).default(0),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    let pharmacyId = user.parentPharmacyId;
    if (user.role === 'PHARMACY_OWNER') {
      const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
      pharmacyId = pharmacy?.id || null;
    }
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const existing = await prisma.posShift.findFirst({
      where: { pharmacyId, staffId: user.id, status: 'OPEN' },
    });

    if (existing) {
      return NextResponse.json({ success: true, shift: existing, message: 'Shift already open' });
    }

    const shift = await prisma.posShift.create({
      data: {
        pharmacyId,
        staffId: user.id,
        openingCash: data.openingCash,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ success: true, shift }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to open shift', 500);
  }
}
