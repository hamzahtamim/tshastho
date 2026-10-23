import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: doctorId } = await params;

  const reviews = await prisma.doctorReview.findMany({
    where: { doctorId, isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      patient: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, reviews });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id: doctorId } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

    // Check user had appointment
    const hadAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        patientId: user.id,
        status: 'COMPLETED',
      },
    });
    if (!hadAppointment) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'You must have a completed appointment to review', 403);
    }

    // Upsert (one review per patient per doctor)
    const review = await prisma.doctorReview.upsert({
      where: { doctorId_patientId: { doctorId, patientId: user.id } },
      update: { rating: data.rating, comment: data.comment || null },
      create: {
        doctorId,
        patientId: user.id,
        rating: data.rating,
        comment: data.comment || null,
      },
    });

    // Recalculate average
    const agg = await prisma.doctorReview.aggregate({
      where: { doctorId, isPublic: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        averageRating: agg._avg.rating || 0,
        totalReviews: agg._count._all,
      },
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REVIEW]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
