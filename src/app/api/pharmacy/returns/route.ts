import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getNextReturnNumber } from '@/lib/pharmacy/returns';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

const itemSchema = z.object({
  medicineId: z.string().min(1),
  batchId: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0).default(0),
  isRestocked: z.boolean().default(false),
  reason: z.string().optional(),
});

const createSchema = z.object({
  type: z.enum(['CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'DAMAGE_WRITE_OFF', 'EXPIRED_WRITE_OFF']),
  supplierId: z.string().optional(),
  originalSaleId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  refundMethod: z.enum(['CASH', 'ORIGINAL', 'STORE_CREDIT', 'NO_REFUND', 'WALLET']).default('CASH'),
  reason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');

  const where: any = { pharmacyId };
  if (type) where.type = type;
  if (status) where.status = status;

  const returns = await prisma.returnOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      items: true,
      supplier: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, returns });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    // Verify medicines belong to pharmacy
    const medicineIds = data.items.map(i => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, pharmacyId },
    });
    if (medicines.length !== medicineIds.length) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Some medicines not found', 400);
    }

    const returnNumber = await getNextReturnNumber(pharmacyId, data.type);

    const itemsData = data.items.map((item) => {
      const med = medicines.find(m => m.id === item.medicineId)!;
      return {
        medicineId: item.medicineId,
        batchId: item.batchId || null,
        medicineName: med.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        isRestocked: item.isRestocked,
        reason: item.reason || null,
      };
    });

    const totalAmount = itemsData.reduce((s, i) => s + i.subtotal, 0);
    const refundAmount = data.type === 'CUSTOMER_RETURN' && data.refundMethod !== 'NO_REFUND' ? totalAmount : 0;

    const ret = await prisma.returnOrder.create({
      data: {
        returnNumber,
        pharmacyId,
        type: data.type,
        status: "PENDING",
        supplierId: data.supplierId || null,
        originalSaleId: data.originalSaleId || null,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        refundMethod: data.refundMethod,
        refundAmount,
        totalAmount,
        reason: data.reason || null,
        notes: data.notes || null,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, return: ret }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[RETURN_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to create return', 500);
  }
}
