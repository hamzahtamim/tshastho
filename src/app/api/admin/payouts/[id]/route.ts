import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'PROCESSING', 'COMPLETE']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const payout = await prisma.doctorPayout.findUnique({ where: { id } });
    if (!payout) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Payout not found', 404);

    const update: any = {};

    if (data.action === 'APPROVE') {
      update.status = 'APPROVED';
      update.approvedById = user.id;
      update.approvedAt = new Date();
    } else if (data.action === 'REJECT') {
      update.status = 'REJECTED';
      update.rejectionReason = data.rejectionReason || null;
      update.approvedById = user.id;
      update.approvedAt = new Date();

      // Unlink earnings
      await prisma.doctorEarning.updateMany({
        where: { payoutId: payout.id },
        data: { payoutId: null },
      });

      // Notify doctor
      await prisma.notification.create({
        data: {
          userId: payout.doctorId ? (await prisma.doctor.findUnique({ where: { id: payout.doctorId } }))?.userId || '' : '',
          title: 'Payout Rejected',
          message: `Your payout request was rejected: ${data.rejectionReason || 'Contact admin'}`,
          type: 'warning',
          category: 'PAYOUT',
        },
      }).catch(() => {});
    } else if (data.action === 'PROCESSING') {
      update.status = 'PROCESSING';
      update.processedAt = new Date();
    } else if (data.action === 'COMPLETE') {
      update.status = 'COMPLETED';
      update.completedAt = new Date();

      // Mark earnings as PAID
      await prisma.doctorEarning.updateMany({
        where: { payoutId: payout.id },
        data: { status: 'PAID', paidAt: new Date() },
      });

      const doctor = payout.doctorId ? await prisma.doctor.findUnique({ where: { id: payout.doctorId } }) : null;
      if (doctor) {
        await prisma.notification.create({
          data: {
            userId: doctor.userId,
            title: 'Payout Completed',
            message: `Your payout of ৳${payout.amount} has been completed.`,
            type: 'success',
            category: 'PAYOUT',
          },
        }).catch(() => {});
      }
    }

    const updated = await prisma.doctorPayout.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ success: true, payout: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PAYOUT_ACTION]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
