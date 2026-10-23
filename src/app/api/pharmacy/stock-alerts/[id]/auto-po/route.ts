import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';

function generatePurchaseNumber(seq: number) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `PO-AUTO-${y}${m}-${String(seq).padStart(4, '0')}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const alert = await prisma.stockAlert.findUnique({
      where: { id },
      include: { medicine: true },
    });
    if (!alert) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Alert not found', 404);

    // Find a supplier — try last used from batch history
    const lastBatch = await prisma.batch.findFirst({
      where: { pharmacyId: alert.pharmacyId, medicineId: alert.medicineId, supplierId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { supplier: true },
    });

    let supplierId = lastBatch?.supplierId;
    if (!supplierId) {
      // Fallback: any active supplier
      const anySupplier = await prisma.supplier.findFirst({
        where: { pharmacyId: alert.pharmacyId, isActive: true },
      });
      if (!anySupplier) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'No supplier found. Please add a supplier first.',
          400
        );
      }
      supplierId = anySupplier.id;
    }

    const count = await prisma.purchaseOrder.count({ where: { pharmacyId: alert.pharmacyId } });
    const purchaseNumber = generatePurchaseNumber(count + 1);

    const suggestedQty = alert.suggestedQty || 50;
    const unitCost = Number(alert.medicine.purchasePrice || 0);
    const subtotal = suggestedQty * unitCost;

    // Default 1 year from now for expiry
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const po = await prisma.purchaseOrder.create({
      data: {
        purchaseNumber,
        pharmacyId: alert.pharmacyId,
        supplierId,
        status: 'ORDERED',
        totalAmount: subtotal,
        dueAmount: subtotal,
        notes: `Auto-generated from stock alert for ${alert.medicine.name}`,
        createdBy: user.id,
        items: {
          create: [{
            medicineId: alert.medicineId,
            batchNumber: `AUTO-${Date.now().toString().slice(-6)}`,
            expiryDate,
            quantity: suggestedQty,
            unitCost,
            subtotal,
          }],
        },
      },
      include: { items: true, supplier: true },
    });

    // Update alert status
    await prisma.stockAlert.update({
      where: { id },
      data: { status: 'ORDERED', orderedAt: new Date() },
    });

    return NextResponse.json({ success: true, purchaseOrder: po }, { status: 201 });
  } catch (error) {
    console.error('[AUTO_PO]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
