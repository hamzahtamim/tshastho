import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

export const dynamic = 'force-dynamic';

const schema = z.object({
  schedules: z.array(z.object({
    dayOfWeek: z.enum(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    slotDuration: z.coerce.number().default(30),
    maxPatients: z.coerce.number().default(10),
    slotType: z.enum(['IN_PERSON', 'ONLINE', 'BOTH']).default('IN_PERSON'),
    chamberAddress: z.string().optional().nullable(),
    chamberId: z.string().optional().nullable(), // <--- FIXED: Added chamberId
    consultationFee: z.coerce.number().default(0),
  })),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: { chamber: true }
  });

  return NextResponse.json({ success: true, schedules });
}

export async function PUT(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.doctorSchedule.deleteMany({ where: { doctorId: doctor.id } });
      if (data.schedules.length > 0) {
        await tx.doctorSchedule.createMany({
          data: data.schedules.map(s => ({
            doctorId: doctor.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDuration: s.slotDuration,
            maxPatients: s.maxPatients,
            slotType: s.slotType,
            chamberAddress: s.chamberAddress || null,
            chamberId: s.chamberId || null, // <--- FIXED: Added chamberId mapping
            consultationFee: s.consultationFee,
          })),
        });
      }
    });

    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: { chamber: true }
    });

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[SCHEDULE_UPDATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update schedule', 500);
  }
}
