import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const transactions = await prisma.walletTransaction.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          }
        }
      }
    });
    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('[ADMIN_TRANSACTIONS]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}
