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
  medicineId: z.string().min(1),
  barcode: z.string().min(3),
  type: z.string().default("EAN13"),
  isPrimary: z.boolean().default(false),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const medicineId = url.searchParams.get('medicineId');

  const where: any = { medicine: { pharmacyId } };
  if (medicineId) where.medicineId = medicineId;

  const barcodes = await prisma.medicineBarcode.findMany({
    where,
    include: { medicine: { select: { id: true, name: true, brand: true } } },
    take: 500,
  });

  return NextResponse.json({ success: true, barcodes });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
    if (!medicine || medicine.pharmacyId !== pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your medicine', 403);
    }

    const existing = await prisma.medicineBarcode.findUnique({ where: { barcode: data.barcode } });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Barcode already exists', 409);

    const barcode = await prisma.medicineBarcode.create({ data });
    return NextResponse.json({ success: true, barcode }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'id required', 400);
  await prisma.medicineBarcode.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
