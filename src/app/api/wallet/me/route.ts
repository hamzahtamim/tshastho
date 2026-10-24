export const dynamic = 'force-dynamic';
// GET /api/wallet/me — own wallet balance + stats — Item 36

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getOrCreateWallet } from '@/lib/wallet';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const wallet = await getOrCreateWallet(user.id);
    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        availableBalance: Number(wallet.availableBalance),
        holdBalance: Number(wallet.holdBalance),
        currency: wallet.currency,
        totalTopUp: Number(wallet.totalTopUp),
        totalSpent: Number(wallet.totalSpent),
        totalEarnings: Number(wallet.totalEarnings),
        totalRefunds: Number(wallet.totalRefunds),
        isActive: wallet.isActive,
        isFrozen: wallet.isFrozen,
        kycVerified: wallet.kycVerified,
      },
    });
  } catch (error) {
    console.error('[WALLET_ME]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
