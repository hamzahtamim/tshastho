import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const { action, note } = await req.json();
    const resolvedParams = await params;
    const requestId = resolvedParams.id;

    const topupReq = await prisma.topUpRequest.findUnique({
      where: { id: requestId },
    });

    if (!topupReq || topupReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 400 });
    }

    if (action === 'REJECT') {
      await prisma.topUpRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', adminNote: note || 'Rejected by admin' },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'APPROVE') {
      // Run in a transaction to ensure data integrity
      await prisma.$transaction(async (tx) => {
        // 1. Update request status
        await tx.topUpRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' },
        });

        // 2. Get or create wallet
        let wallet = await tx.walletAccount.findUnique({ where: { userId: topupReq.userId } });
        if (!wallet) {
          wallet = await tx.walletAccount.create({ data: { userId: topupReq.userId } });
        }

        // 3. Update Wallet Balance
        const currentBalance = Number(wallet.balance);
        const topupAmount = Number(topupReq.amount);
        const newBalance = currentBalance + topupAmount;

        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: topupAmount },
            availableBalance: { increment: topupAmount },
            totalTopUp: { increment: topupAmount },
          },
        });

        // 4. Create WalletTransaction for user history
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'TOPUP',
            direction: 'CREDIT',
            amount: topupAmount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            vertical: 'PLATFORM',
            description: `Top up via ${topupReq.method}`,
            referenceNumber: topupReq.trxId || topupReq.id,
          }
        });

        // 5. Create Ledger Entry
        await tx.ledgerEntry.create({
          data: {
            debitAccount: 'PLATFORM',
            creditAccount: 'CUSTOMER',
            amount: topupReq.amount,
            description: `Manual Topup via ${topupReq.method} (TrxID: ${topupReq.trxId})`,
            referenceId: topupReq.id,
          },
        });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN_TOPUP_ACTION]', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
