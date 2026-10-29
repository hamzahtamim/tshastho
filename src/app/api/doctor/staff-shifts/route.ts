import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

const schema = z.object({
  staffId: z.string().min(1),
  chamberId: z.string().min(1),
  dayOfWeek: z.string().min(3),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  graceMinutes: z.coerce.number().int().min(0).max(60).default(10),
});

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const staffId = url.searchParams.get('staffId');

  const where: any = { staff: { doctorId: doctor.id } };
  if (staffId) where.staffId = staffId;

  const shifts = await prisma.staffShift.findMany({
    where,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: {
      staff: { include: { user: { select: { name: true } } } },
      chamber: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, shifts });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const staff = await prisma.doctorStaff.findUnique({ where: { id: data.staffId } });
    if (!staff || staff.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your staff', 403);
    }

    const shift = await prisma.staffShift.create({ data });
    return NextResponse.json({ success: true, shift }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'id required', 400);
  await prisma.staffShift.update({ where: { id }, data: { isActive: false } }).catch(() => {});
  return NextResponse.json({ success: true });
}
