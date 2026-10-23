import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getDefaultTemplates } from '@/lib/sms';
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
  key: z.string().min(2),
  name: z.string().min(2),
  language: z.string().default('bn'),
  body: z.string().min(5),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  // Seed default templates if not exist
  const existing = await prisma.smsTemplate.count({ where: { pharmacyId } });
  if (existing === 0) {
    const defaults = getDefaultTemplates();
    for (const t of defaults) {
      await prisma.smsTemplate.create({
        data: { pharmacyId, ...t, isSystem: true },
      }).catch(() => {});
    }
  }

  const templates = await prisma.smsTemplate.findMany({
    where: { pharmacyId },
    orderBy: [{ key: 'asc' }, { language: 'asc' }],
  });

  return NextResponse.json({ success: true, templates });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const template = await prisma.smsTemplate.upsert({
      where: { pharmacyId_key_language: { pharmacyId, key: data.key, language: data.language } },
      update: { name: data.name, body: data.body, isActive: data.isActive },
      create: { pharmacyId, ...data },
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
