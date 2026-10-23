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
    if (!tranId) return NextResponse.redirect(`${appUrl}/payment/failed`);

    const payment = await prisma.payment.findUnique({ where: { id: tranId } });
    if (!payment) return NextResponse.redirect(`${appUrl}/payment/failed`);

    const gateway = getGateway('SSLCOMMERZ');
    const verify = await gateway.verify(payment.gatewayTxnId || '', { val_id: data.val_id });

    if (verify.success) {
      // P0-05 FIX: Bind val_id to tran_id and verify amount
      if (verify.amount !== undefined && Math.abs(Number(payment.amount) - verify.amount) > 0.01) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: 'Payment amount mismatch' }
        });
        return NextResponse.redirect(`${appUrl}/payment/failed?paymentId=${payment.id}`);
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

      return NextResponse.redirect(`${appUrl}/payment/success?paymentId=${payment.id}`);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: verify.failureReason || 'Verification failed' },
    });

    return NextResponse.redirect(`${appUrl}/payment/failed?paymentId=${payment.id}`);

  } catch (error: unknown) {
    console.error('[SSL_SUCCESS]', error instanceof Error ? error.message : error);
    return NextResponse.redirect(`${appUrl}/payment/failed`);
  }
}
