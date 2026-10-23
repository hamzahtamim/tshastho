import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { isSlotAvailable } from '@/lib/doctor/schedule';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  doctorId: z.string().min(1),
  date: z.string().min(8),
  time: z.string().min(4),
  slotType: z.string().optional(),
  fee: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

    // Check slot availability
    const available = await isSlotAvailable(data.doctorId, data.date, data.time);
    if (!available) {
      return errorResponse(ErrorCodes.CONFLICT, 'This slot is no longer available', 409);
    }

    // Prevent duplicate booking by same patient for same doctor/date/time
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        patientId: user.id,
        date: data.date,
        time: data.time,
        status: { in: ['REQUESTED', 'CONFIRMED', 'PATIENT_CONFIRMED', 'RESCHEDULED'] as any },
      },
    });
    if (existing) {
      return errorResponse(ErrorCodes.CONFLICT, 'You already booked this slot', 409);
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        doctorId: data.doctorId,
        date: data.date,
        time: data.time,
        status: "REQUESTED",
      },
    });

    // Notify doctor
    try {
      await prisma.notification.create({
        data: {
          userId: doctor.userId,
          title: 'New Appointment Request',
          message: `New appointment on ${data.date} at ${data.time}`,
          type: 'info',
          category: 'APPOINTMENT',
          link: '/doctor',
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully! 🎉',
      appointment,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[APPOINTMENT_BOOK]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Booking failed', 500);
  }
}
