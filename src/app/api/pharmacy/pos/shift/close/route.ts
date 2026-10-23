import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  closingCash: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const shift = await prisma.posShift.findFirst({
      where: { staffId: user.id, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'No open shift found', 404);

    const expectedCash = Number(shift.openingCash) + Number(shift.totalCash);
    const difference = data.closingCash - expectedCash;

    const updated = await prisma.posShift.update({
      where: { id: shift.id },
      data: {
        closingCash: data.closingCash,
        expectedCash,
        difference,
        status: 'CLOSED',
        closedAt: new Date(),
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ success: true, shift: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to close shift', 500);
  }
}
