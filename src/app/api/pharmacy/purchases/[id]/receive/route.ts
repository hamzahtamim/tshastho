import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { recordStockMovement } from '@/lib/pharmacy/stock';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { recordPurchase } from "@/lib/pharmacy/ledger";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Purchase not found', 404);

    // Ownership check
    if (user.role === 'PHARMACY_OWNER') {
      const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
      if (!pharmacy || pharmacy.id !== purchase.pharmacyId) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Not your purchase', 403);
      }
    } else if (user.role === 'PHARMACY_STAFF' && user.parentPharmacyId !== purchase.pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your pharmacy purchase', 403);
    }

    if (purchase.status === 'RECEIVED') {
      return errorResponse(ErrorCodes.CONFLICT, 'Purchase already received', 409);
    }

    // Process each item: create batch, add stock, log movement
    const result = await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        // Check for duplicate batch number
        const existingBatch = await tx.batch.findFirst({
          where: {
            pharmacyId: purchase.pharmacyId,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            isActive: true,
          },
        });

        let batchId: string;
        if (existingBatch) {
          // Add to existing batch
          await tx.batch.update({
            where: { id: existingBatch.id },
            data: { quantity: Number(existingBatch.quantity) + Number(item.quantity) },
          });
          batchId = existingBatch.id;
        } else {
          // Create new batch
          const batch = await tx.batch.create({
            data: {
              pharmacyId: purchase.pharmacyId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              quantity: item.quantity,
              initialQty: item.quantity,
              purchasePrice: item.unitCost,
              sellingPrice: Number(item.unitCost) * 1.2, // default 20% markup — can be adjusted
              supplierId: purchase.supplierId,
              note: `PO ${purchase.purchaseNumber}`,
            },
          });
          batchId = batch.id;
        }

        // Update purchase item's batchId and receivedQty
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { batchId, receivedQty: item.quantity },
        });

        // Record stock movement (this also updates Medicine.stock)
        await recordStockMovement({
          pharmacyId: purchase.pharmacyId,
          medicineId: item.medicineId,
          type: 'PURCHASE',
          quantity: item.quantity,
          batchId,
          referenceId: purchase.id,
          reason: `Purchase ${purchase.purchaseNumber}`,
          userId: user.id,
        });
      }

      // Update purchase status
      await tx.purchaseOrder.update({
        where: { id: purchase.id },
        data: {
          status: 'RECEIVED',
          receivedDate: new Date(),
        },
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PURCHASE_RECEIVE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to receive purchase', 500);
  }
}
