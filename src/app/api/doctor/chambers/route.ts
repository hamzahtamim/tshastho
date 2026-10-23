import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  name: z.string().min(2),
  address: z.string().min(3),
  area: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  gpsLatitude: z.coerce.number().optional(),
  gpsLongitude: z.coerce.number().optional(),
  mapUrl: z.string().optional(),
  defaultFee: z.coerce.number().min(0).default(0),
  isPrimary: z.boolean().default(false),
  operatingHours: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const chambers = await prisma.doctorChamber.findMany({
    where: { doctorId: doctor.id, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, chambers });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // If setting primary, unset others
    if (data.isPrimary) {
      await prisma.doctorChamber.updateMany({
        where: { doctorId: doctor.id },
        data: { isPrimary: false },
      });
    }

    const chamber = await prisma.doctorChamber.create({
      data: {
        doctorId: doctor.id,
        ...data,
      },
    });

    return NextResponse.json({ success: true, chamber }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[CHAMBER_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
