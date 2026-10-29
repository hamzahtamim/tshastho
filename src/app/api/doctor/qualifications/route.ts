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
  qualifications: z.array(z.object({
    degree: z.string().min(2),
    institution: z.string().optional(),
    year: z.coerce.number().int().min(1950).max(2100).optional(),
    country: z.string().optional(),
  })).min(1),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const qualifications = await prisma.doctorQualification.findMany({
    where: { doctorId: doctor.id },
    orderBy: { year: 'desc' },
  });

  return NextResponse.json({ success: true, qualifications });
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
      await tx.doctorQualification.deleteMany({ where: { doctorId: doctor.id } });
      await tx.doctorQualification.createMany({
        data: data.qualifications.map(q => ({
          doctorId: doctor.id,
          degree: q.degree,
          institution: q.institution || null,
          year: q.year || null,
          country: q.country || null,
        })),
      });
    });

    const qualifications = await prisma.doctorQualification.findMany({
      where: { doctorId: doctor.id },
      orderBy: { year: 'desc' },
    });

    return NextResponse.json({ success: true, qualifications });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update', 500);
  }
}
