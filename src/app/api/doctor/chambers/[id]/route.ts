import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

const schema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  gpsLatitude: z.coerce.number().optional(),
  gpsLongitude: z.coerce.number().optional(),
  mapUrl: z.string().optional(),
  defaultFee: z.coerce.number().min(0).optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  operatingHours: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const chamber = await prisma.doctorChamber.findUnique({ where: { id } });
    if (!chamber) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Chamber not found', 404);

    const doctor = await await getDoctorContext(user);
    if (user.role !== 'SUPER_ADMIN' && (!doctor || chamber.doctorId !== doctor.id)) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
    }

    if (data.isPrimary && doctor) {
      await prisma.doctorChamber.updateMany({
        where: { doctorId: chamber.doctorId, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.doctorChamber.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, chamber: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const chamber = await prisma.doctorChamber.findUnique({ where: { id } });
  if (!chamber) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Chamber not found', 404);

  if (user.role !== 'SUPER_ADMIN') {
    const doctor = await await getDoctorContext(user);
    if (!doctor || chamber.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
    }
  }

  await prisma.doctorChamber.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
