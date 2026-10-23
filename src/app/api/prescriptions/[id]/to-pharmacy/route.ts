import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  pharmacyId: z.string().min(1),
  notes: z.string().optional(),
});

function genRequestNumber(seq: number) {
  const d = new Date();
  return `RXREQ-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${String(seq + 1).padStart(5, '0')}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const rx = await prisma.prescription.findUnique({ where: { id } });
    if (!rx || rx.patientId !== user.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your prescription', 403);
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: data.pharmacyId } });
    if (!pharmacy) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    // Prevent duplicate pending
    const existing = await prisma.rxPharmacyRequest.findFirst({
      where: { prescriptionId: id, pharmacyId: data.pharmacyId, status: 'PENDING' },
    });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Already requested to this pharmacy', 409);

    const count = await prisma.rxPharmacyRequest.count();
    const requestNumber = genRequestNumber(count);

    const request = await prisma.rxPharmacyRequest.create({
      data: {
        requestNumber,
        prescriptionId: id,
        patientId: user.id,
        pharmacyId: data.pharmacyId,
        notes: data.notes || null,
        status: 'PENDING',
      },
    });

    // Notify pharmacy owner
    const owner = await prisma.user.findUnique({ where: { id: pharmacy.userId } });
    if (owner) {
      await prisma.notification.create({
        data: {
          userId: owner.id,
          title: 'New Prescription Request',
          message: `Patient requested prescription fulfillment (${requestNumber})`,
          type: 'info',
          category: 'RX_REQUEST',
          link: '/pharmacy/rx-requests',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[RX_REQUEST]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
