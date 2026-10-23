import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

function generatePurchaseNumber(seq: number) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `PO-${y}${m}-${String(seq).padStart(4, '0')}`;
}

const createSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().min(1),
    batchNumber: z.string().min(1),
    mfgDate: z.string().optional(),
    expiryDate: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().min(0),
  })).min(1),
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
  const status = url.searchParams.get('status');

  const where: any = { pharmacyId };
  if (status) where.status = status;

  const purchases = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      supplier: { select: { id: true, name: true, companyName: true } },
      items: {
        include: { medicine: { select: { id: true, name: true, brand: true } } },
      },
    },
  });

  return NextResponse.json({ success: true, purchases });
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

    // Verify supplier belongs to pharmacy
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier || supplier.pharmacyId !== pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Supplier not in your pharmacy', 403);
    }

    // Verify all medicines belong to pharmacy
    const medicineIds = data.items.map((i) => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, pharmacyId },
    });
    if (medicines.length !== medicineIds.length) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'One or more medicines not in your pharmacy', 400);
    }

    // Get next sequence number for this month
    const count = await prisma.purchaseOrder.count({ where: { pharmacyId } });
    const purchaseNumber = generatePurchaseNumber(count + 1);

    // Calculate totals
    const itemsWithSubtotal = data.items.map((item) => ({
      ...item,
      subtotal: item.quantity * item.unitCost,
    }));
    const totalAmount = itemsWithSubtotal.reduce((sum, i) => sum + i.subtotal, 0);

    // Create purchase order with items
    const purchase = await prisma.purchaseOrder.create({
      data: {
        purchaseNumber,
        pharmacyId,
        supplierId: data.supplierId,
        status: 'ORDERED',
        totalAmount,
        dueAmount: totalAmount,
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
        createdBy: user.id,
        items: {
          create: itemsWithSubtotal.map((item) => ({
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
            expiryDate: new Date(item.expiryDate),
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PURCHASE_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to create purchase', 500);
  }
}
