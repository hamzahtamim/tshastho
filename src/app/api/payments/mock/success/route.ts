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
  if (!paymentId) return NextResponse.redirect(`${appUrl}/payment/failed`);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.redirect(`${appUrl}/payment/failed`);

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      gatewayRefId: `MOCK-REF-${Date.now()}`,
      paidAt: new Date(),
    },
  });

  await recordLedgerEntry({
    paymentId,
    debitAccount: 'CUSTOMER',
    creditAccount: 'PLATFORM',
    amount: Number(payment.amount),
    description: `Mock payment ${payment.paymentNumber}`,
  });

  if (payment.orderId) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'PAID', isPaid: true, paymentMethod: 'MOCK' },
    });
  }

  return NextResponse.redirect(`${appUrl}/payment/success?paymentId=${paymentId}`);
}
