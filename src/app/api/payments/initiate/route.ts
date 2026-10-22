import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { getGateway } from '@/lib/payments';
import { generatePaymentNumber } from '@/lib/payments/utils';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  orderId: z.string().optional(),
  amount: z.coerce.number().positive(),
  gateway: z.string().default('SSLCOMMERZ'),
  purpose: z.string().default('ORDER_PAYMENT'),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // If orderId provided, verify ownership & get amount
    if (!data.orderId && data.purpose !== 'WALLET_TOPUP') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'A valid orderId is required for this payment type.', 400);
    }
    if (data.purpose === 'WALLET_TOPUP' && data.amount > 50000) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Top-up amount exceeds the allowed limit of 50,000.', 400);
    }
    let orderAmount = data.amount;
    if (data.orderId) {
      const order = await prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
      if (order.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not your order', 403);
      orderAmount = Number(order.finalAmount);
    }

    const paymentNumber = generatePaymentNumber();

    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        userId: user.id,
        orderId: data.orderId,
        amount: orderAmount,
        method: data.gateway.toUpperCase() as any,
        status: 'INITIATED',
        gatewayProvider: data.gateway.toUpperCase(),
        metadata: { purpose: data.purpose },
      },
    });

    const gateway = getGateway(data.gateway);

    const result = await gateway.initiate(
      {
        amount: orderAmount,
        currency: 'BDT',
        orderId: data.orderId,
        customerName: user.name || 'Customer',
        customerEmail: user.email,
        customerPhone: user.phone || undefined,
        customerAddress: user.address || undefined,
        productName: data.purpose,
      },
      payment.id
    );

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PENDING",
        gatewayTxnId: result.gatewayTxnId,
        gatewayPayload: result.raw,
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentNumber,
      redirectUrl: result.redirectUrl,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PAYMENT_INITIATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Payment initiation failed', 500);
  }
}
