import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

const schema = z.object({
  patientId: z.string().optional(),
  localPatientId: z.string().optional(),
  type: z.enum(['FITNESS', 'SICK_LEAVE', 'MEDICAL_FITNESS', 'DISABILITY', 'VACCINATION', 'SURGERY', 'OTHER']),
  title: z.string().optional(),
  subject: z.string().min(2),
  body: z.string().min(5),
  diagnosis: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  restDays: z.coerce.number().int().min(0).optional(),
});

function genCertNo(seq: number) {
  return `CERT-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
}

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const certs = await prisma.medicalCertificate.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      patient: { select: { id: true, name: true } },
      localPatient: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, certificates: certs });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (!data.patientId && !data.localPatientId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Patient required', 400);
    }

    const count = await prisma.medicalCertificate.count();
    const certificateNo = genCertNo(count + 1);

    const cert = await prisma.medicalCertificate.create({
      data: {
        certificateNo,
        doctorId: doctor.id,
        patientId: data.patientId || null,
        localPatientId: data.localPatientId || null,
        type: data.type,
        title: data.title || null,
        subject: data.subject,
        body: data.body,
        diagnosis: data.diagnosis || null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        restDays: data.restDays || null,
        signatureUrl: doctor.signatureUrl,
      },
    });

    return NextResponse.json({ success: true, certificate: cert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[CERT_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
