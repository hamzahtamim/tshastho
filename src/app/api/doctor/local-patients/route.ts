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
  name: z.string().min(2),
  phone: z.string().optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const search = url.searchParams.get('q') || '';
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);

  const where: any = { doctorId: doctor.id };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const patients = await prisma.localPatient.findMany({
    where,
    orderBy: { lastVisitDate: 'desc' },
    take: limit,
    include: {
      _count: { select: { prescriptions: true } },
    },
  });

  return NextResponse.json({ success: true, patients });
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

    // Check if same phone+name exists
    let patient = null;
    if (data.phone) {
      patient = await prisma.localPatient.findFirst({
        where: { doctorId: doctor.id, phone: data.phone, name: data.name },
      });
    }

    if (patient) {
      patient = await prisma.localPatient.update({
        where: { id: patient.id },
        data: { ...data, lastVisitDate: new Date() },
      });
    } else {
      patient = await prisma.localPatient.create({
        data: { doctorId: doctor.id, ...data },
      });
    }

    return NextResponse.json({ success: true, patient }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[LOCAL_PATIENT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
