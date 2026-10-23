import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
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
  isVatRegistered: z.boolean().default(false),
  vatNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  vatRate: z.coerce.number().min(0).max(50).default(15),
  enableVatOnPos: z.boolean().default(false),
  enableVatOnOnline: z.boolean().default(false),
  invoicePrefix: z.string().default("INV"),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const config = await prisma.taxConfiguration.findUnique({ where: { pharmacyId } });
  return NextResponse.json({ success: true, config });
}

export async function PUT(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const config = await prisma.taxConfiguration.upsert({
      where: { pharmacyId },
      update: data,
      create: { pharmacyId, ...data },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
