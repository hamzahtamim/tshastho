import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doc = await prisma.doctorDocument.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!doc) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    if (data.action === 'VERIFY') {
      await prisma.doctorDocument.update({
        where: { id },
        data: { status: 'VERIFIED', verifiedById: user.id, verifiedAt: new Date() },
      });
      await prisma.notification.create({
        data: {
          userId: doc.doctor.userId,
          title: 'Document Verified',
          message: `Your ${doc.type} document has been verified.`,
          type: 'success',
          category: 'VERIFICATION',
        },
      }).catch(() => {});
    } else {
      await prisma.doctorDocument.update({
        where: { id },
        data: {
          status: 'REJECTED',
          verifiedById: user.id,
          verifiedAt: new Date(),
          rejectionReason: data.rejectionReason,
        },
      });
      await prisma.notification.create({
        data: {
          userId: doc.doctor.userId,
          title: 'Document Rejected',
          message: `Your ${doc.type} document was rejected: ${data.rejectionReason}`,
          type: 'warning',
          category: 'VERIFICATION',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
