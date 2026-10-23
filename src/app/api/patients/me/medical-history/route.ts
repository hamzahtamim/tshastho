import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const allergySchema = z.object({
  allergen: z.string().min(1),
  type: z.string().default("DRUG"),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).default('MODERATE'),
  reaction: z.string().optional(),
});

const conditionSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['CONDITION', 'SURGERY', 'HOSPITALIZATION', 'PROCEDURE']).default('CONDITION'),
  diagnosedDate: z.string().optional(),
  hospital: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
  isChronic: z.boolean().default(false),
});

const medicationSchema = z.object({
  medicineName: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isOngoing: z.boolean().default(true),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
});

const familySchema = z.object({
  relation: z.string().min(1),
  condition: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const [allergies, conditions, medications, familyHistory, consents] = await Promise.all([
    prisma.patientAllergy.findMany({ where: { patientId: user.id, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientCondition.findMany({ where: { patientId: user.id, isActive: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientMedication.findMany({ where: { patientId: user.id, isOngoing: true }, orderBy: { createdAt: 'desc' } }),
    prisma.patientFamilyHistory.findMany({ where: { patientId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.doctorPatientConsent.findMany({
      where: { patientId: user.id, status: 'ACTIVE' },
      include: { doctor: { include: { user: { select: { name: true } } } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    allergies, conditions, medications, familyHistory, consents,
  });
}

const typeSchema = z.object({
  kind: z.enum(['ALLERGY', 'CONDITION', 'MEDICATION', 'FAMILY']),
  data: z.union([allergySchema, conditionSchema, medicationSchema, familySchema]),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const { kind, data } = typeSchema.parse(body);

    let created: any;

    if (kind === 'ALLERGY') {
      created = await prisma.patientAllergy.create({
        data: { patientId: user.id, ...(data as any) },
      });
    } else if (kind === 'CONDITION') {
      const d = data as any;
      created = await prisma.patientCondition.create({
        data: {
          patientId: user.id,
          name: d.name,
          type: d.type,
          diagnosedDate: d.diagnosedDate ? new Date(d.diagnosedDate) : null,
          hospital: d.hospital || null,
          doctorName: d.doctorName || null,
          notes: d.notes || null,
          isChronic: d.isChronic,
        },
      });
    } else if (kind === 'MEDICATION') {
      const d = data as any;
      created = await prisma.patientMedication.create({
        data: {
          patientId: user.id,
          medicineName: d.medicineName,
          dosage: d.dosage || null,
          frequency: d.frequency || null,
          startDate: d.startDate ? new Date(d.startDate) : null,
          endDate: d.endDate ? new Date(d.endDate) : null,
          isOngoing: d.isOngoing,
          prescribedBy: d.prescribedBy || null,
          notes: d.notes || null,
        },
      });
    } else {
      created = await prisma.patientFamilyHistory.create({
        data: { patientId: user.id, ...(data as any) },
      });
    }

    return NextResponse.json({ success: true, record: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[HISTORY_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const kind = url.searchParams.get('kind');
  if (!id || !kind) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'id and kind required', 400);

  try {
    if (kind === 'ALLERGY') {
      const r = await prisma.patientAllergy.findUnique({ where: { id } });
      if (!r || r.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
      await prisma.patientAllergy.update({ where: { id }, data: { isActive: false } });
    } else if (kind === 'CONDITION') {
      const r = await prisma.patientCondition.findUnique({ where: { id } });
      if (!r || r.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
      await prisma.patientCondition.update({ where: { id }, data: { isActive: false } });
    } else if (kind === 'MEDICATION') {
      const r = await prisma.patientMedication.findUnique({ where: { id } });
      if (!r || r.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
      await prisma.patientMedication.update({ where: { id }, data: { isOngoing: false, endDate: new Date() } });
    } else if (kind === 'FAMILY') {
      const r = await prisma.patientFamilyHistory.findUnique({ where: { id } });
      if (!r || r.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
      await prisma.patientFamilyHistory.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
