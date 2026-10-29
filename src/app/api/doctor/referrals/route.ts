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
  consultingDoctorId: z.string().min(1),
  patientId: z.string().min(1),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
  reason: z.string().optional(),
  clinicalSummary: z.string().optional(),
  questionForSpecialist: z.string().optional(),
});

function genCaseNumber(seq: number) {
  return `REF-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
}

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const dir = url.searchParams.get('dir') || 'sent';

  const where = dir === 'received'
    ? { consultingDoctorId: doctor.id }
    : { referringDoctorId: doctor.id };

  const cases = await prisma.doctorReferralCase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      referringDoctor: { include: { user: { select: { name: true } } } },
      consultingDoctor: { include: { user: { select: { name: true } } } },
      patient: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ success: true, cases });
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

    if (data.consultingDoctorId === doctor.id) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Cannot refer to yourself', 400);
    }

    const count = await prisma.doctorReferralCase.count();
    const caseNumber = genCaseNumber(count + 1);

    const created = await prisma.doctorReferralCase.create({
      data: {
        caseNumber,
        referringDoctorId: doctor.id,
        consultingDoctorId: data.consultingDoctorId,
        patientId: data.patientId,
        priority: data.priority,
        reason: data.reason || null,
        clinicalSummary: data.clinicalSummary || null,
        questionForSpecialist: data.questionForSpecialist || null,
      },
    });

    // Notify consulting doctor
    const consultDoc = await prisma.doctor.findUnique({ where: { id: data.consultingDoctorId } });
    if (consultDoc) {
      await prisma.notification.create({
        data: {
          userId: consultDoc.userId,
          title: 'New Referral',
          message: `Case ${caseNumber} referred to you (${data.priority})`,
          type: data.priority === 'EMERGENCY' ? 'warning' : 'info',
          category: 'REFERRAL',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, case: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REFERRAL]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
