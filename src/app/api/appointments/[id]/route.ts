import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { changeAppointmentStatus } from '@/lib/doctor/appointment';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['PATIENT_CONFIRM', 'RESCHEDULE', 'CANCEL']),
  reason: z.string().optional(),
  newDate: z.string().optional(),
  newTime: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verify ownership
    const apt = await prisma.appointment.findUnique({ where: { id } });
    if (!apt || apt.patientId !== user.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your appointment', 403);
    }

    const updated = await changeAppointmentStatus({
      appointmentId: id,
      userId: user.id,
      action: data.action,
      reason: data.reason,
      newDate: data.newDate,
      newTime: data.newTime,
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PATIENT_APT_ACTION]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const apt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { id: true, name: true } } } },
      patient: { select: { id: true, name: true, email: true, phone: true } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!apt || (apt.patientId !== user.id && user.role !== 'SUPER_ADMIN')) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not authorized', 403);
  }

  return NextResponse.json({ success: true, appointment: apt });
}
