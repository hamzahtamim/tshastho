import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const doctorId = resolvedParams.id;

    const reviews = await prisma.doctorReview.findMany({
      where: { doctorId, isPublic: true },
      include: { patient: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const resolvedParams = await params;
    const doctorId = resolvedParams.id;
    const { rating, comment } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if already reviewed
    const existing = await prisma.doctorReview.findUnique({
      where: { doctorId_patientId: { doctorId, patientId: user.id } }
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this doctor.' }, { status: 400 });
    }

    // Create review and update doctor stats in a transaction
    const newReview = await prisma.$transaction(async (tx) => {
      const review = await tx.doctorReview.create({
        data: { doctorId, patientId: user.id, rating: Number(rating), comment }
      });

      // Calculate new average
      const aggregate = await tx.doctorReview.aggregate({
        where: { doctorId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.doctor.update({
        where: { id: doctorId },
        data: {
          averageRating: aggregate._avg.rating || 0,
          totalReviews: aggregate._count.rating || 0
        }
      });

      return review;
    });

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error('[POST_REVIEW]', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
