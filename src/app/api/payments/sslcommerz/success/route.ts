import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGateway } from '@/lib/payments';
import { recordLedgerEntry } from '@/lib/payments/utils';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((v, k) => { data[k] = String(v); });

    const tranId = data.tran_id;
    if (!tranId) return NextResponse.redirect(new URL(`/payment/failed`, process.env.NEXT_PUBLIC_APP_URL || req.url));

    const payment = await prisma.payment.findUnique({ where: { id: tranId } });
    if (!payment) return NextResponse.redirect(new URL(`/payment/failed`, process.env.NEXT_PUBLIC_APP_URL || req.url));

    const gateway = getGateway('SSLCOMMERZ');
    const verify = await gateway.verify(payment.gatewayTxnId || '', { val_id: data.val_id });

    if (verify.success) {
      // P0-05 FIX: Bind val_id to tran_id and verify amount
      if (verify.amount !== undefined && Math.abs(Number(payment.amount) - verify.amount) > 0.01) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: 'Payment amount mismatch' }
        });
        return NextResponse.redirect(new URL(`/payment/failed?paymentId=${payment.id}`, process.env.NEXT_PUBLIC_APP_URL || req.url));
      }

      await prisma.$transaction(async (tx) => {
        // 1. Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            gatewayRefId: verify.gatewayRefId,
            gatewayPayload: verify.raw as any,
            paidAt: new Date(),
          },
        });
        // Handle Wallet Top-Up
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
              description: 'Automatic Top up via SSLCommerz',
              referenceNumber: verify.gatewayRefId,
            }
          });
        }

        // 2. Create Ledger entry
        await recordLedgerEntry({
          paymentId: payment.id,
          debitAccount: 'CUSTOMER',
          creditAccount: 'PLATFORM',
          amount: Number(payment.amount),
          description: `Payment ${payment.paymentNumber} completed`,
          referenceId: verify.gatewayRefId,
        }, tx);

        // 3. Update order if linked
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'PAID', isPaid: true, paymentMethod: 'SSLCOMMERZ' },
          });
        }
      });

      return NextResponse.redirect(new URL(`/payment/success?paymentId=${payment.id}`, process.env.NEXT_PUBLIC_APP_URL || req.url));
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: verify.failureReason || 'Verification failed' },
    });

    return NextResponse.redirect(new URL(`/payment/failed?paymentId=${payment.id}`, process.env.NEXT_PUBLIC_APP_URL || req.url));

  } catch (error: unknown) {
    console.error('[SSL_SUCCESS]', error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL(`/payment/failed`, process.env.NEXT_PUBLIC_APP_URL || req.url));
  }
}
