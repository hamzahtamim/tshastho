import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

const itemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.string().optional(),
  beforeAfterMeal: z.string().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  localPatientId: z.string().min(1),
  chamberId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  investigations: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  notes: z.string().optional(),
  fee: z.coerce.number().min(0).default(0),
  items: z.array(itemSchema).min(1),
});

function generateRxNo(seq: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `LRX-${y}${m}-${String(seq).padStart(5, '0')}`;
}

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const patientId = url.searchParams.get('patientId');
  const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);

  const where: any = { doctorId: doctor.id };
  if (patientId) where.localPatientId = patientId;

  const prescriptions = await prisma.localPrescription.findMany({
    where,
    orderBy: { visitDate: 'desc' },
    take: limit,
    include: {
      localPatient: true,
      chamber: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, prescriptions });
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

    const patient = await prisma.localPatient.findUnique({
      where: { id: data.localPatientId },
    });
    if (!patient || patient.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Patient not in your list', 403);
    }

    const count = await prisma.localPrescription.count({ where: { doctorId: doctor.id } });
    const prescriptionNo = generateRxNo(count + 1);

    const prescription = await prisma.localPrescription.create({
      data: {
        prescriptionNo,
        doctorId: doctor.id,
        localPatientId: data.localPatientId,
        chamberId: data.chamberId || null,
        chiefComplaint: data.chiefComplaint || null,
        examination: data.examination || null,
        diagnosis: data.diagnosis || null,
        investigations: data.investigations || null,
        advice: data.advice || null,
        followUpDate: data.followUpDate || null,
        followUpNotes: data.followUpNotes || null,
        notes: data.notes || null,
        fee: data.fee,
        items: data.items as any,
      },
    });

    // Update patient visit counter
    await prisma.localPatient.update({
      where: { id: data.localPatientId },
      data: {
        totalVisits: { increment: 1 },
        lastVisitDate: new Date(),
      },
    });

    // Auto-create walk-in earning if fee > 0
    if (data.fee > 0) {
      await prisma.walkInEarning.create({
        data: {
          doctorId: doctor.id,
          chamberId: data.chamberId || null,
          localPatientId: data.localPatientId,
          patientName: patient.name,
          amount: data.fee,
          method: 'CASH',
          serviceType: 'CONSULTATION',
          description: `Prescription ${prescriptionNo}`,
        },
      });
    }

    return NextResponse.json({ success: true, prescription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[LOCAL_RX]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
