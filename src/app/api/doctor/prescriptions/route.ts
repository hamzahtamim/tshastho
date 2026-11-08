import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getDoctorContext } from '@/lib/auth/doctor-context';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import crypto from 'crypto';

const prescriptionSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  investigations: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
  items: z.array(z.object({
    medicineName: z.string().min(1),
    strength: z.string().optional(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    quantity: z.string().optional(),
    beforeAfterMeal: z.string().optional(),
    instructions: z.string().optional(),
  })).min(1),
});


export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const doctor = await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { name: true, phone: true } },
        items: true
      }
    });

    return NextResponse.json({ success: true, prescriptions });
  } catch (error) {
    console.error('[GET_PRESCRIPTIONS_ERROR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch prescriptions', 500);
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  // ডাক্তার হিসেবে ভেরিফাই করা (যদিও আমরা আইডি হিসেবে user.id ব্যবহার করব)
  const doctor = await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = prescriptionSchema.parse(body);

    // র‍্যান্ডম প্রেসক্রিপশন নম্বর তৈরি
    const prescriptionNo = 'RX-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const prescription = await prisma.prescription.create({
      data: {
        patientId: data.patientId,
        doctorId: user.id, // 🚀 FIXED: ডাক্তারের User ID ব্যবহার করা হলো (Doctor Table ID নয়)
        appointmentId: data.appointmentId || null,
        prescriptionNo,
        source: 'MANUAL',
        imageUrl: null, // ছবি ছাড়া ম্যানুয়াল প্রেসক্রিপশন
        chiefComplaint: data.chiefComplaint || null,
        examination: data.examination || null,
        diagnosis: data.diagnosis || null,
        investigations: data.investigations || null,
        advice: data.advice || null,
        followUpDate: data.followUpDate || null, // ফিক্সড: Date অবজেক্টের বদলে স্ট্রিং হিসেবে সেভ হবে
        followUpNotes: data.followUpNotes || null,
        items: {
          create: data.items.map(item => ({
            medicineName: item.medicineName,
            strength: item.strength || null,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: item.quantity ? parseInt(item.quantity) : null,
            beforeAfterMeal: item.beforeAfterMeal || null,
            instructions: item.instructions || null,
          }))
        }
      },
      include: { items: true }
    });

    return NextResponse.json({ success: true, prescription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[CREATE_PRESCRIPTION_ERROR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create prescription', 500);
  }
}
