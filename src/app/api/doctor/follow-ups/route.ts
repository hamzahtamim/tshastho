import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

const schema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  prescriptionId: z.string().optional(),
  reminderDate: z.string().min(1),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const filter = url.searchParams.get('filter') || 'upcoming';

  const now = new Date();
  const where: any = { doctorId: doctor.id };
  if (filter === 'upcoming') {
    where.reminderDate = { gte: now };
    where.isCompleted = false;
  } else if (filter === 'overdue') {
    where.reminderDate = { lt: now };
    where.isCompleted = false;
  } else if (filter === 'completed') {
    where.isCompleted = true;
  }

  const reminders = await prisma.followUpReminder.findMany({
    where,
    orderBy: { reminderDate: 'asc' },
    take: 100,
    include: {
      patient: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ success: true, reminders });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const r = await prisma.followUpReminder.create({
      data: {
        doctorId: doctor.id,
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
        prescriptionId: data.prescriptionId || null,
        reminderDate: new Date(data.reminderDate),
        reason: data.reason || null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ success: true, reminder: r }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
