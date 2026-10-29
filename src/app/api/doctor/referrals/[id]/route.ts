import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

const schema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'COMPLETE', 'CANCEL']),
  consultingNotes: z.string().optional(),
  declinedReason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const c = await prisma.doctorReferralCase.findUnique({ where: { id } });
    if (!c) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const doctor = await await getDoctorContext(user);
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not a doctor', 404);

    const isRef = c.referringDoctorId === doctor.id;
    const isCon = c.consultingDoctorId === doctor.id;
    if (!isRef && !isCon) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);

    const update: any = {};
    if (data.action === 'ACCEPT') {
      if (!isCon) return errorResponse(ErrorCodes.FORBIDDEN, 'Only consultant', 403);
      update.status = 'ACCEPTED';
      update.acceptedAt = new Date();
    } else if (data.action === 'DECLINE') {
      if (!isCon) return errorResponse(ErrorCodes.FORBIDDEN, 'Only consultant', 403);
      update.status = 'DECLINED';
      update.declinedAt = new Date();
      update.declinedReason = data.declinedReason || null;
    } else if (data.action === 'COMPLETE') {
      if (!isCon) return errorResponse(ErrorCodes.FORBIDDEN, 'Only consultant', 403);
      update.status = 'COMPLETED';
      update.completedAt = new Date();
      update.consultingNotes = data.consultingNotes || null;
    } else if (data.action === 'CANCEL') {
      if (!isRef) return errorResponse(ErrorCodes.FORBIDDEN, 'Only referrer', 403);
      update.status = 'CANCELLED';
    }

    const updated = await prisma.doctorReferralCase.update({ where: { id }, data: update });
    return NextResponse.json({ success: true, case: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
