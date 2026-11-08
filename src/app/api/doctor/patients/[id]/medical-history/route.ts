import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';
import { z } from 'zod';

const typeSchema = z.object({
  kind: z.enum(['ALLERGY', 'CONDITION', 'MEDICATION', 'FAMILY']),
  data: z.any(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  
  const user = auth.user!;
  const { id: patientId } = await params;
  
  const doctor = await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  let actualPatientUserId = patientId.trim();
  const patientUser = await prisma.user.findUnique({ where: { id: actualPatientUserId } });
  if (!patientUser) {
    const patientRecord = await prisma.patient.findUnique({ where: { id: actualPatientUserId } });
    if (patientRecord) actualPatientUserId = patientRecord.userId;
  }

  const allConsentsRaw: any[] = await prisma.$queryRaw`SELECT * FROM "DoctorPatientConsent"`;
  const cleanId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  const hasConsent = allConsentsRaw.some((c: any) => 
    cleanId(c.patientId) === cleanId(actualPatientUserId) && 
    cleanId(c.doctorId) === cleanId(doctor.id) &&
    String(c.status).toUpperCase() === 'ACTIVE'
  );

  if (!hasConsent) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Patient has not granted you access', 403);
  }

  try {
    const body = await req.json();
    const { kind, data } = typeSchema.parse(body);

    let created: any;

    if (kind === 'ALLERGY') {
      created = await prisma.patientAllergy.create({ data: { patientId: actualPatientUserId, ...(data as any) } });
    } else if (kind === 'CONDITION') {
      const d = data as any;
      created = await prisma.patientCondition.create({
        data: { patientId: actualPatientUserId, name: d.name, type: d.type || 'CONDITION', diagnosedDate: d.diagnosedDate ? new Date(d.diagnosedDate) : null, hospital: d.hospital || null, doctorName: d.doctorName || null, notes: d.notes || null, isChronic: d.isChronic || false },
      });
    } else if (kind === 'MEDICATION') {
      const d = data as any;
      created = await prisma.patientMedication.create({
        data: { patientId: actualPatientUserId, medicineName: d.medicineName, dosage: d.dosage || null, frequency: d.frequency || null, startDate: d.startDate ? new Date(d.startDate) : null, isOngoing: d.isOngoing ?? true, prescribedBy: d.prescribedBy || null, notes: d.notes || null },
      });
    } else {
      created = await prisma.patientFamilyHistory.create({ data: { patientId: actualPatientUserId, ...(data as any) } });
    }

    return NextResponse.json({ success: true, record: created }, { status: 201 });
  } catch (error) {
    console.error('[DOCTOR_HISTORY_CREATE]', error);
    return NextResponse.json({ message: 'Failed to add record' }, { status: 500 });
  }
}
