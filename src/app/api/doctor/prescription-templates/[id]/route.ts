import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const template = await prisma.prescriptionTemplate.findUnique({ where: { id } });
  if (!template) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

  if (user.role !== 'SUPER_ADMIN') {
    const doctor = await await getDoctorContext(user);
    if (!doctor || template.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
    }
  }

  await prisma.prescriptionTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  // Increment usage count
  await prisma.prescriptionTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
