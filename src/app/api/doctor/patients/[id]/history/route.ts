import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id: patientId } = await params;

  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  // Check consent
  const consent = await prisma.doctorPatientConsent.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: doctor.id } },
  });

  const hasActiveConsent =
    consent &&
    consent.status === 'ACTIVE' &&
    (!consent.expiresAt || consent.expiresAt > new Date());

  if (!hasActiveConsent) {
    // Log denied access
    await prisma.medicalHistoryAccessLog.create({
      data: {
        patientId,
        accessedById: user.id,
        accessType: 'DENIED_NO_CONSENT',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    }).catch(() => {});

    return errorResponse(
      ErrorCodes.FORBIDDEN,
      'Patient has not granted you access to their medical history',
      403
    );
  }

  // Log access
  await prisma.medicalHistoryAccessLog.create({
    data: {
      consentId: consent.id,
      patientId,
      accessedById: user.id,
      accessType: 'HISTORY_VIEW',
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    },
  }).catch(() => {});

  const [patient, allergies, conditions, medications, familyHistory, pastPrescriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, email: true, phone: true, address: true, patientProfile: true },
    }),
    prisma.patientAllergy.findMany({ where: { patientId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientCondition.findMany({ where: { patientId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientMedication.findMany({ where: { patientId, isOngoing: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientFamilyHistory.findMany({ where: { patientId } }),
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    consent: { scope: consent.scope, expiresAt: consent.expiresAt },
    patient, allergies, conditions, medications, familyHistory, pastPrescriptions,
  });
}
