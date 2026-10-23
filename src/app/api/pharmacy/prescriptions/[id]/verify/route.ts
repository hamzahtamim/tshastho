import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  rejectionReason: z.string().optional(),
  validUntil: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Prescription not found', 404);

    if (prescription.status !== "PENDING") {
      return errorResponse(ErrorCodes.CONFLICT, 'Prescription already processed', 409);
    }

    const updateData: any = {
      verifiedById: user.id,
      verifiedAt: new Date(),
    };

    if (data.action === 'VERIFY') {
      updateData.status = 'VERIFIED';
      updateData.validUntil = data.validUntil ? new Date(data.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      updateData.status = 'REJECTED';
      updateData.rejectionReason = data.rejectionReason || 'Rejected by pharmacist';
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: updateData,
    });

    // Notify patient
    await prisma.notification.create({
      data: {
        userId: prescription.patientId,
        title: data.action === 'VERIFY' ? 'Prescription Verified' : 'Prescription Rejected',
        message: data.action === 'VERIFY'
          ? 'Your prescription has been verified by the pharmacy.'
          : `Your prescription was rejected: ${data.rejectionReason || 'Contact pharmacy'}`,
        type: data.action === 'VERIFY' ? 'success' : 'warning',
        category: 'PRESCRIPTION',
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, prescription: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PRESCRIPTION_VERIFY]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to process', 500);
  }
}
