import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { sendWhatsApp } from '@/lib/whatsapp';
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
  message: z.string().optional(),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
  customerId: z.string().optional(),
  recipientName: z.string().optional(),
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

    if (!data.message && !data.templateName) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'message or templateName required', 400);
    }

    const log = await prisma.whatsAppLog.create({
      data: {
        pharmacyId,
        customerId: data.customerId || null,
        recipientName: data.recipientName || null,
        phone: data.phone,
        message: data.message || null,
        templateName: data.templateName || null,
        templateData: data.templateParams ? { params: data.templateParams } : undefined,
        provider: 'MANUAL',
        status: 'QUEUED',
        createdById: user.id,
      },
    });

    const result = await sendWhatsApp({
      to: data.phone,
      body: data.message,
      templateName: data.templateName,
      templateParams: data.templateParams,
    });

    const updated = await prisma.whatsAppLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        providerRefId: result.messageId || null,
        failureReason: result.error || null,
        sentAt: result.success ? new Date() : null,
        provider: process.env.META_WHATSAPP_PHONE_ID ? 'META' : (process.env.TWILIO_ACCOUNT_SID ? 'TWILIO' : 'MANUAL'),
      },
    });

    return NextResponse.json({ success: true, log: updated }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    console.error('[WHATSAPP_SEND]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const logs = await prisma.whatsAppLog.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json({ success: true, logs });
}
