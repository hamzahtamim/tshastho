import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { findByCode, recordReferralUsage } from '@/lib/pharmacy/referral';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(3),
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const referral = await findByCode(data.code);
    if (!referral) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Invalid referral code', 404);

    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Order not found', 404);
    if (order.patientId !== user.id) return errorResponse(ErrorCodes.FORBIDDEN, 'Not your order', 403);

    // Prevent duplicate
    const existing = await prisma.referralUsage.findFirst({
      where: { referralId: referral.id, orderId: order.id },
    });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Referral already applied', 409);

    const usage = await recordReferralUsage({
      referralId: referral.id,
      orderId: order.id,
      customerId: user.id,
      orderAmount: Number(order.finalAmount),
    });

    return NextResponse.json({ success: true, usage }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REFERRAL_APPLY]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to apply', 500);
  }
}
