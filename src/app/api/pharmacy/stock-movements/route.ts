import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { recordStockMovement } from '@/lib/pharmacy/stock';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const createSchema = z.object({
  medicineId: z.string().min(1),
  type: z.enum(['PURCHASE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'DAMAGE', 'EXPIRED', 'OPENING']),
  quantity: z.coerce.number().int().positive(),
  batchId: z.string().optional(),
  reason: z.string().optional(),
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
  const type = url.searchParams.get('type');
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

  const where: any = { pharmacyId };
  if (medicineId) where.medicineId = medicineId;
  if (type) where.type = type;

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      medicine: { select: { id: true, name: true, brand: true } },
      batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, movements });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
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

    const movement = await recordStockMovement({
      pharmacyId,
      medicineId: data.medicineId,
      type: data.type,
      quantity: data.quantity,
      batchId: data.batchId,
      reason: data.reason,
      userId: user.id,
    });

    return NextResponse.json({ success: true, movement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[STOCK_MOVEMENT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to record movement', 500);
  }
}
