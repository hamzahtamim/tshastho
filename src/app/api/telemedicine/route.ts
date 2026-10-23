import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import crypto from 'crypto';

const schema = z.object({
  appointmentId: z.string().optional(),
  doctorId: z.string().min(1),
  type: z.enum(['VIDEO', 'AUDIO', 'CHAT']).default('VIDEO'),
  scheduledAt: z.string().optional(),
});

function generateRoomId() {
  return 'tsh-' + crypto.randomBytes(8).toString('hex');
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  // If doctor, show doctor's sessions; if patient, show patient's sessions
  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const where = doctor ? { doctorId: doctor.id } : { patientId: user.id };

  const sessions = await prisma.telemedicineSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      doctor: { include: { user: { select: { id: true, name: true } } } },
      patient: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  return NextResponse.json({ success: true, sessions });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

    const session = await prisma.telemedicineSession.create({
      data: {
        doctorId: data.doctorId,
        patientId: user.id,
        appointmentId: data.appointmentId || null,
        roomId: generateRoomId(),
        type: data.type,
        status: 'SCHEDULED',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    // Notify doctor
    await prisma.notification.create({
      data: {
        userId: doctor.userId,
        title: 'New Telemedicine Session',
        message: `Patient booked a ${data.type.toLowerCase()} consultation.`,
        type: 'info',
        category: 'TELEMEDICINE',
        link: '/doctor/telemedicine',
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[TELEMEDICINE_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
