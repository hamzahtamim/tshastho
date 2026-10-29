import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const doctor: any = await prisma.doctor.findUnique({
      where: { userId: user.id }
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Fetch appointments to get unique patients
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    });

    // Extract unique patients
    const patientMap = new Map();
    appointments.forEach(apt => {
      if (apt.patient && !patientMap.has(apt.patient.id)) {
        patientMap.set(apt.patient.id, apt.patient);
      }
    });

    const patients = Array.from(patientMap.values());
    return NextResponse.json({ success: true, patients });
  } catch (error) {
    console.error('[DOCTOR_PATIENTS]', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}
