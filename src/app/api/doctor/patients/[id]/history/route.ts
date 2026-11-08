import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id: patientId } = await params;

  const doctor = await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  // ১. Patient ID থেকে User ID বের করা
  let actualPatientUserId = patientId;
  const patientUser = await prisma.user.findUnique({ where: { id: patientId } });
  
  if (!patientUser) {
    const patientRecord = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patientRecord) {
      actualPatientUserId = patientRecord.userId;
    }
  }

  
  // 🚀 DEEP DEBUG DIAGNOSTIC
  const allConsentsRaw: any[] = await prisma.$queryRaw`SELECT * FROM "DoctorPatientConsent"`;
  
  console.log("\n=== 🕵️‍♂️ CONSENT DIAGNOSTIC START ===");
  console.log("Target Patient ID:", `"${actualPatientUserId}"`, "Length:", actualPatientUserId?.length);
  console.log("Target Doctor ID:", `"${doctor.id}"`, "Length:", doctor.id?.length);
  console.log("Total consents in DB:", allConsentsRaw.length);

  const consent = allConsentsRaw.find((c: any) => {
    const dbPatientId = String(c.patientId || '').trim();
    const dbDoctorId = String(c.doctorId || '').trim();
    const targetPatientId = String(actualPatientUserId || '').trim();
    const targetDoctorId = String(doctor.id || '').trim();

    console.log(`Checking DB Record -> Patient: "${dbPatientId}", Doctor: "${dbDoctorId}", Status: "${c.status}", Expires: ${c.expiresAt}`);
    return dbPatientId === targetPatientId && dbDoctorId === targetDoctorId;
  }) || null;

  if (consent) {
    console.log("✅ MATCH FOUND!");
    console.log("Consent Status exact string:", `"${consent.status}"`);
    console.log("Consent ExpiresAt exact value:", consent.expiresAt, "Type:", typeof consent.expiresAt);
  } else {
    console.log("❌ NO MATCH FOUND IN LOOP.");
  }
  console.log("=== 🕵️‍♂️ CONSENT DIAGNOSTIC END ===\n");

  // ৩. কনসেন্ট স্ট্যাটাস চেক (আরও রোবাস্ট করা হলো)
  const hasActiveConsent =
    consent &&
    String(consent.status).trim().toUpperCase() === 'ACTIVE' &&
    (!consent.expiresAt || new Date(consent.expiresAt).getTime() > Date.now() || isNaN(new Date(consent.expiresAt).getTime()));


  if (!hasActiveConsent) {
    await prisma.medicalHistoryAccessLog.create({
      data: {
        patientId: actualPatientUserId,
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

  // ৪. কনসেন্ট থাকলে ডেটা ফেচ করা
  await prisma.medicalHistoryAccessLog.create({
    data: {
      consentId: consent.id,
      patientId: actualPatientUserId,
      accessedById: user.id,
      accessType: 'HISTORY_VIEW',
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    },
  }).catch(() => {});

  const [patient, allergies, conditions, medications, familyHistory, pastPrescriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actualPatientUserId },
      select: { id: true, name: true, email: true, phone: true, address: true, avatarUrl: true, patientProfile: true }
    }),
    prisma.patientAllergy.findMany({ where: { patientId: actualPatientUserId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientCondition.findMany({ where: { patientId: actualPatientUserId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientMedication.findMany({ where: { patientId: actualPatientUserId, isOngoing: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientFamilyHistory.findMany({ where: { patientId: actualPatientUserId } }),
    prisma.prescription.findMany({
      where: { patientId: actualPatientUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    consent: { scope: consent.scope, expiresAt: consent.expiresAt },
    patient,
    allergies,
    conditions,
    medications,
    familyHistory,
    pastPrescriptions,
  });
}
