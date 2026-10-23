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
  customerIds: z.array(z.string()).min(1),
  templateKey: z.string().min(1),
  provider: z.enum(['SSL_WIRELESS', 'TWILIO', 'BANGLALINK', 'MANUAL']).default('MANUAL'),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const template = await getTemplate(pharmacyId, data.templateKey);
    if (!template) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Template not found', 404);

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });

    const customers = await prisma.user.findMany({
      where: { id: { in: data.customerIds }, phone: { not: null } },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const c of customers) {
      try {
        const message = renderTemplate(template.body, {
          customerName: c.name || 'Customer',
          pharmacyName: pharmacy?.shopName || 'Tshastho',
        });
        await sendSms({
          phone: c.phone!,
          message,
          provider: data.provider as any,
          pharmacyId,
          customerId: c.id,
          recipientName: c.name || undefined,
          templateKey: data.templateKey,
          createdById: user.id,
        });
        sent++;
      } catch (e) {
        failed++;
        errors.push(`${c.phone}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, sent, failed, errors: errors.slice(0, 10) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
