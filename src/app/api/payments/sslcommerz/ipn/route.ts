// SSLCommerz IPN (Instant Payment Notification) webhook — Item 23
// Server-to-server notification for reliable payment confirmation.
// SSLCommerz POSTs form-urlencoded; we respond 200 with {status:'OK'}.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGateway } from '@/lib/payments';
import { recordLedgerEntry } from '@/lib/payments/utils';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const status = String(form.get('status') ?? '');
    const tranId = String(form.get('tran_id') ?? '');
    const valId = String(form.get('val_id') ?? '');
    const bankTranId = String(form.get('bank_tran_id') ?? '');

    if (!tranId) {
      return NextResponse.json({ status: 'IGNORED' });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: tranId }, { gatewayTxnId: tranId }],
      },
    });
    if (!payment) {
      console.warn('[SSLCOMMERZ_IPN] Payment not found for tran_id', tranId);
      return NextResponse.json({ status: 'PAYMENT_NOT_FOUND' });
    }

    // Idempotency
    if (payment.status === 'COMPLETED' || payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED') {
      return NextResponse.json({ status: 'ALREADY_PROCESSED' });
    }

    if (status === 'VALID' && valId) {
      const gateway = getGateway(payment.gatewayProvider ?? 'SSLCOMMERZ');
      const result = await gateway.verify(valId, payment.gatewayTxnId ?? undefined);

      if (result.success) {
            // P0-04/05 FIX: Verify amount before marking as paid
            if (result.amount !== undefined && Math.abs(Number(payment.amount) - result.amount) > 0.01) {
              console.error('[SSLCOMMERZ_IPN] Amount mismatch for', payment.id);
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED', failureReason: 'IPN amount mismatch' }
              });
              return NextResponse.json({ status: 'AMOUNT_MISMATCH' });
            }
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            gatewayRefId: bankTranId || result.gatewayRefId,
            gatewayPayload: (result.raw ?? undefined) as object | undefined,
          },
        });
        await recordLedgerEntry({
          paymentId: payment.id,
          debitAccount: 'CUSTOMER',
          creditAccount: 'PLATFORM',
          amount: Number(payment.amount),
          description: 'Payment confirmed via IPN',
          referenceId: bankTranId || payment.id,
        }).catch((e) => console.error('[IPN_LEDGER]', e));
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: result.failureReason ?? 'IPN verify failed',
          },
        });
      }
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: status === 'FAILED' ? 'FAILED' : 'CANCELLED',
          failureReason: 'IPN status: ' + status,
        },
      });
    }

    return NextResponse.json({ status: 'OK' });
  } catch (err) {
    console.error('[SSLCOMMERZ_IPN]', err);
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}
