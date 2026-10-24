import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordLedgerEntry } from '@/lib/payments/utils';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENTS_MOCK_MODE !== 'true') {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId');
  if (!paymentId) return NextResponse.redirect(new URL('/payment/failed', appUrl));

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.redirect(new URL('/payment/failed', appUrl));

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        gatewayRefId: `MOCK-REF-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    await recordLedgerEntry({
      paymentId: payment.id,
      debitAccount: 'CUSTOMER',
      creditAccount: 'PLATFORM',
      amount: Number(payment.amount),
      description: `Mock payment ${payment.paymentNumber}`,
    }, tx);

    // NEW: Handle Wallet Top-Up
    if (payment.metadata && (payment.metadata as any).purpose === 'WALLET_TOPUP') {
      const topupAmount = Number(payment.amount);
      let wallet = await tx.walletAccount.findUnique({ where: { userId: payment.userId } });
      if (!wallet) {
        wallet = await tx.walletAccount.create({ data: { userId: payment.userId } });
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + topupAmount;

      await tx.walletAccount.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: topupAmount },
          availableBalance: { increment: topupAmount },
          totalTopUp: { increment: topupAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          direction: 'CREDIT',
          amount: topupAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          vertical: 'PLATFORM',
          description: 'Automatic Top up via Mock Gateway',
          referenceNumber: payment.gatewayRefId || payment.paymentNumber,
        }
      });
    }

    if (payment.orderId) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID', isPaid: true, paymentMethod: 'MOCK' },
      });
    }
  });

  return NextResponse.redirect(new URL(`/payment/success?paymentId=${paymentId}`, process.env.NEXT_PUBLIC_APP_URL || req.url));
}
