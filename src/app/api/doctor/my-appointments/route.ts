import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';
import { getDoctorContext } from '@/lib/auth/doctor-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['DOCTOR', 'DOCTOR_STAFF', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  try {
    const doctor: any = await getDoctorContext(user);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor record missing in database for this user.' }, { status: 404 });
    }

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
