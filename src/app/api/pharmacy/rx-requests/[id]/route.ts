import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'CANCEL']),
  rejectionReason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const rxReq = await prisma.rxPharmacyRequest.findUnique({
      where: { id },
      include: {
        prescription: { include: { items: true } },
      },
    });
    if (!rxReq) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const update: any = {
      respondedById: user.id,
      respondedAt: new Date(),
    };

    if (data.action === 'ACCEPT') {
      update.status = 'ACCEPTED';
    } else if (data.action === 'REJECT') {
      update.status = 'REJECTED';
      update.rejectionReason = data.rejectionReason || null;
    } else if (data.action === 'CANCEL') {
      update.status = 'CANCELLED';
    }

    const updated = await prisma.rxPharmacyRequest.update({ where: { id }, data: update });

    // Notify patient
    const notifyMap: any = {
      ACCEPT: { title: 'Rx Accepted', msg: 'Pharmacy accepted your prescription', type: 'success' },
      REJECT: { title: 'Rx Rejected', msg: `Pharmacy rejected: ${data.rejectionReason || 'Contact pharmacy'}`, type: 'warning' },
      CANCEL: { title: 'Rx Cancelled', msg: 'Request cancelled', type: 'info' },
    };
    const notify = notifyMap[data.action];
    if (notify) {
      await prisma.notification.create({
        data: {
          userId: rxReq.patientId,
          title: notify.title,
          message: notify.msg,
          type: notify.type,
          category: 'RX_REQUEST',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
