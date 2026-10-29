import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getDoctorContext } from '@/lib/auth/doctor-context';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const doctor = await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const dateFilter = url.searchParams.get('date');

  const where: any = { doctorId: doctor.id };
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as any;
  } else if (!statusFilter) {
    where.status = { in: ['REQUESTED', 'CONFIRMED', 'PATIENT_CONFIRMED', 'RESCHEDULED'] as any };
  }
  if (dateFilter) where.date = dateFilter;

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    take: 200,
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  return NextResponse.json({ success: true, appointments });
}
