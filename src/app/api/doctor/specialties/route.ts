import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  specialties: z.array(z.object({
    name: z.string().min(2),
    isPrimary: z.boolean().default(false),
  })).min(1),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const specialties = await prisma.doctorSpecialty.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, specialties });
}

export async function PUT(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.doctorSpecialty.deleteMany({ where: { doctorId: doctor.id } });
      await tx.doctorSpecialty.createMany({
        data: data.specialties.map(s => ({
          doctorId: doctor.id,
          name: s.name,
          isPrimary: s.isPrimary,
        })),
      });
    });

    const specialties = await prisma.doctorSpecialty.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, specialties });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update', 500);
  }
}
