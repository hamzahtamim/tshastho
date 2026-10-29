import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'DOCTOR') {
    return NextResponse.json({ error: `You are logged in as ${user.role}, not a DOCTOR.` }, { status: 403 });
  }

  try {
    // 1. Fetch Doctor Profile (including User data)
    const doctor: any = await prisma.doctor.findUnique({
      where: { userId: user.id },
      include: { user: true } as any
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor record missing in database for this user.' }, { status: 404 });
    }

    // 2. Fetch Appointments
    // FIX: 'patient' in Appointment model is directly the User model.
    // So we just need to include 'patient: true' without nesting 'user: true'.
    const appointments: any[] = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: { patient: true } as any,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, doctor, appointments });
  } catch (error: any) {
    console.error('[DOCTOR_APPTS_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}
