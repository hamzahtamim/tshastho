import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });

    // Verify this appointment belongs to this doctor
    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    if (doctor?.id !== appointment.doctorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (appointment.paymentStatus === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // 1. Update appointment
      await tx.appointment.update({
        where: { id },
        data: { paymentStatus: 'PAID' },
      });

      // 2. Update Doctor Earning
      await tx.doctorEarning.updateMany({
        where: { appointmentId: id },
        data: { status: 'AVAILABLE' }, // Mark as available for payout
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to collect cash' }, { status: 500 });
  }
}
