import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  // Ensure the method belongs to this doctor
  const method = await prisma.payoutMethod.findUnique({ where: { id } });
  if (!method || method.doctorId !== doctor.id) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
  }

  await prisma.payoutMethod.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  // Unset all defaults first
  await prisma.payoutMethod.updateMany({
    where: { doctorId: doctor.id },
    data: { isDefault: false },
  });

  // Set the new default
  const updated = await prisma.payoutMethod.updateMany({
    where: { id, doctorId: doctor.id },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true, updated: updated.count > 0 });
}
