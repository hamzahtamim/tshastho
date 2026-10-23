import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const itemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  imageUrl: z.string().url(),
  doctorName: z.string().optional(),
  doctorRegNo: z.string().optional(),
  hospitalName: z.string().optional(),
  prescriptionNo: z.string().optional(),
  issueDate: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(itemSchema).default([]),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const prescription = await prisma.prescription.create({
      data: {
        patientId: user.id,
        doctorName: data.doctorName || null,
        doctorRegNo: data.doctorRegNo || null,
        hospitalName: data.hospitalName || null,
        prescriptionNo: data.prescriptionNo || null,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        diagnosis: data.diagnosis || null,
        notes: data.notes || null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        imageUrl: data.imageUrl,
        status: "PENDING",
        items: {
          create: data.items.map((i) => ({
            medicineName: i.medicineName,
            strength: i.strength || null,
            dosage: i.dosage || null,
            frequency: i.frequency || null,
            duration: i.duration || null,
            quantity: i.quantity || null,
            instructions: i.instructions || null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, prescription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PRESCRIPTION_UPLOAD]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload', 500);
  }
}
