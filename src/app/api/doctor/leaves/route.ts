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
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const leaves = await prisma.doctorLeave.findMany({
    where: { doctorId: doctor.id },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ success: true, leaves });
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

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'End date must be after start date', 400);
    }

    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId: doctor.id,
        startDate: start,
        endDate: end,
        reason: data.reason || null,
        status: 'APPROVED',
      },
    });

    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to add leave', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing id', 400);

  const leave = await prisma.doctorLeave.findUnique({ where: { id } });
  if (!leave || leave.doctorId !== doctor.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not your leave', 403);
  }

  await prisma.doctorLeave.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
