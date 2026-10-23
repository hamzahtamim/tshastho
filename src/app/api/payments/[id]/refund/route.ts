import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getGateway } from '@/lib/payments';
import { generateRefundNumber, recordLedgerEntry } from '@/lib/payments/utils';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Payment not found', 404);

    if (payment.status !== 'COMPLETED' && payment.status !== 'PARTIALLY_REFUNDED') {
      return errorResponse(ErrorCodes.CONFLICT, 'Only completed payments can be refunded', 409);
    }

    const refundable = Number(payment.amount) - Number(payment.refundedAmount);
    const refundAmount = data.amount || refundable;

    if (refundAmount > refundable) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, `Max refundable: ${refundable}`, 400);
    }

    const refund = await prisma.refund.create({
      data: {
        refundNumber: generateRefundNumber(),
        paymentId: payment.id,
        amount: refundAmount,
        reason: data.reason,
        status: 'PROCESSING',
      },
    });

    // Attempt gateway refund if supported
    let gatewayRefId: string | undefined;
    try {
      if (payment.gatewayProvider) {
        const gateway = getGateway(payment.gatewayProvider);
        if (gateway.refund && payment.gatewayRefId) {
          const result = await gateway.refund(payment.gatewayRefId, refundAmount, data.reason);
          gatewayRefId = result?.refund_ref_id || result?.bank_tran_id;
        }
      }
    } catch (e) {
      console.warn('[REFUND_GATEWAY]', e instanceof Error ? e.message : 'Unknown error');
    }

    const newRefundedTotal = Number(payment.refundedAmount) + refundAmount;
    const fullyRefunded = newRefundedTotal >= Number(payment.amount);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: newRefundedTotal,
        status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });

    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'COMPLETED', processedAt: new Date(), gatewayRefId },
    });

    await recordLedgerEntry({
      paymentId: payment.id,
      debitAccount: 'PLATFORM',
      creditAccount: 'CUSTOMER',
      amount: refundAmount,
      description: `Refund ${refund.refundNumber}`,
      referenceId: gatewayRefId,
    });

    return NextResponse.json({ success: true, refund, refundedTotal: newRefundedTotal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REFUND]', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Refund failed', 500);
  }
}
