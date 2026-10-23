import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { sendSms, renderTemplate, getTemplate } from '@/lib/sms';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

const schema = z.object({
  phone: z.string().min(6),
  message: z.string().min(1),
  customerId: z.string().optional(),
  recipientName: z.string().optional(),
  templateKey: z.string().optional(),
  variables: z.record(z.string(), z.any()).optional(),
  provider: z.enum(['SSL_WIRELESS', 'TWILIO', 'BANGLALINK', 'MANUAL']).default('MANUAL'),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    let message = data.message;

    // If template key given, render with variables
    if (data.templateKey && data.variables) {
      const template = await getTemplate(pharmacyId, data.templateKey);
      if (template) {
        message = renderTemplate(template.body, data.variables);
      }
    }

    const log = await sendSms({
      phone: data.phone,
      message,
      provider: data.provider as any,
      pharmacyId,
      customerId: data.customerId,
      recipientName: data.recipientName,
      templateKey: data.templateKey,
      createdById: user.id,
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[SMS_SEND]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const logs = await prisma.smsLog.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json({ success: true, logs });
}
