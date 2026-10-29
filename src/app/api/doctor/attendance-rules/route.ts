import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

const schema = z.object({
  chamberId: z.string().min(1),
  radiusMeters: z.coerce.number().int().min(50).max(5000).default(200),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
  lateGraceMinutes: z.coerce.number().int().min(0).max(60).default(10),
  requireSelfie: z.boolean().default(true),
  requireGps: z.boolean().default(true),
});

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const chamberId = url.searchParams.get('chamberId');

  const where: any = { chamber: { doctorId: doctor.id } };
  if (chamberId) where.chamberId = chamberId;

  const rules = await prisma.staffAttendanceRule.findMany({
    where,
    include: { chamber: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, rules });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const rule = await prisma.staffAttendanceRule.upsert({
      where: { chamberId: data.chamberId },
      update: data,
      create: data,
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
