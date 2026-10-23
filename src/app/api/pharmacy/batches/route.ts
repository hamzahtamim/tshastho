import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { recordStockMovement } from '@/lib/pharmacy/stock';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const createSchema = z.object({
  medicineId: z.string().min(1),
  batchNumber: z.string().min(1),
  mfgDate: z.string().optional(),
  expiryDate: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  purchasePrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  supplierId: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  let pharmacyId = user.parentPharmacyId;
  if (user.role === 'PHARMACY_OWNER') {
    const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    pharmacyId = pharmacy?.id || null;
  }
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const medicineId = url.searchParams.get('medicineId');
  const expiring = url.searchParams.get('expiring');

  const where: any = { pharmacyId, isActive: true };
  if (medicineId) where.medicineId = medicineId;
  if (expiring === 'true') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 90);
    where.expiryDate = { lte: cutoff };
    where.quantity = { gt: 0 };
  }

  const batches = await prisma.batch.findMany({
    where,
    orderBy: { expiryDate: 'asc' },
    include: {
      medicine: { select: { id: true, name: true, brand: true, genericName: true } },
      supplier: { select: { id: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json({ success: true, batches });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    let pharmacyId = user.parentPharmacyId;
    if (user.role === 'PHARMACY_OWNER') {
      const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
      pharmacyId = pharmacy?.id || null;
    }
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    // Verify medicine belongs to pharmacy
    const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
    if (!medicine || medicine.pharmacyId !== pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Medicine not in your pharmacy', 403);
    }

    const batch = await prisma.batch.create({
      data: {
        pharmacyId,
        medicineId: data.medicineId,
        batchNumber: data.batchNumber,
        mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
        expiryDate: new Date(data.expiryDate),
        quantity: data.quantity,
        initialQty: data.quantity,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        supplierId: data.supplierId || null,
        note: data.note || null,
      },
    });

    // Log stock movement (also updates Medicine.stock)
    await recordStockMovement({
      pharmacyId,
      medicineId: data.medicineId,
      type: 'OPENING',
      quantity: data.quantity,
      batchId: batch.id,
      referenceId: batch.id,
      reason: `Batch opening: ${data.batchNumber}`,
      userId: user.id,
    });

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[BATCH_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to create batch', 500);
  }
}
