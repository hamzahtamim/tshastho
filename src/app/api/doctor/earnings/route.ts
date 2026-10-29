import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getEarningsSummary } from '@/lib/doctor/earnings';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const summary = await getEarningsSummary(doctor.id);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

  const earnings = await prisma.doctorEarning.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      appointment: { select: { id: true, date: true, time: true } },
    },
  });

  return NextResponse.json({ success: true, summary, earnings });
}
