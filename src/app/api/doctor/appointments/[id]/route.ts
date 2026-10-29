import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { changeAppointmentStatus } from '@/lib/doctor/appointment';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['CONFIRM', 'RESCHEDULE', 'CANCEL', 'COMPLETE', 'NO_SHOW']),
  reason: z.string().optional(),
  newDate: z.string().optional(),
  newTime: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updated = await changeAppointmentStatus({
      appointmentId: id,
      userId: user.id,
      action: data.action,
      reason: data.reason,
      newDate: data.newDate,
      newTime: data.newTime,
      notes: data.notes,
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[DOCTOR_APT_ACTION]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
