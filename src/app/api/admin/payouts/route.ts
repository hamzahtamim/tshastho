import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  const payouts = await prisma.doctorPayout.findMany({
    orderBy: { requestedAt: 'desc' },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      payoutMethod: true,
    }
  });

  return NextResponse.json({ success: true, payouts });
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const { payoutId, status, reason } = await req.json();

    await prisma.$transaction(async (tx) => {
      const payout = await tx.doctorPayout.update({
        where: { id: payoutId },
        data: {
          status: status as any,
          rejectionReason: status === 'REJECTED' ? reason : null,
          approvedById: auth.user!.id,
          approvedAt: status === 'APPROVED' || status === 'COMPLETED' ? new Date() : null,
        },
      });

      if (status === 'COMPLETED' || status === 'APPROVED') {
        // Mark the corresponding earnings as PAID
        const availableEarnings = await tx.doctorEarning.findMany({
          where: { doctorId: payout.doctorId, status: 'AVAILABLE' },
          orderBy: { createdAt: 'asc' }
        });
        
        let remainingToMark = Number(payout.amount);
        for (const earning of availableEarnings) {
          if (remainingToMark <= 0) break;
          await tx.doctorEarning.update({
            where: { id: earning.id },
            data: { status: 'PAID' as any },
          });
          remainingToMark -= Number(earning.netAmount);
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_PAYOUT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
  }
}
