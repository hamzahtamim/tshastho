import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getNextTransferNumber } from '@/lib/pharmacy/transfer';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  suggestions: z.array(z.object({
    medicineId: z.string(),
    fromBranchId: z.string(),
    toBranchId: z.string(),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pharmacy = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    if (!pharmacy) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    // Group by branch pair
    const grouped: Record<string, any[]> = {};
    for (const s of data.suggestions) {
      const key = `${s.fromBranchId}::${s.toBranchId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }

    const created = [];

    for (const [key, items] of Object.entries(grouped)) {
      const [fromBranchId, toBranchId] = key.split('::');
      const transferNumber = await getNextTransferNumber(pharmacy.id);

      const medicines = await prisma.medicine.findMany({
        where: { id: { in: items.map(i => i.medicineId) } },
        select: { id: true, name: true },
      });

      const transfer = await prisma.branchTransfer.create({
        data: {
          transferNumber,
          pharmacyId: pharmacy.id,
          fromBranchId,
          toBranchId,
          status: 'PENDING',
          reason: 'Auto-suggested from stock imbalance',
          requestedById: user.id,
          items: {
            create: items.map(i => ({
              medicineId: i.medicineId,
              medicineName: medicines.find(m => m.id === i.medicineId)?.name || 'Medicine',
              quantity: i.quantity,
            })),
          },
        },
      });
      created.push(transfer);
    }

    return NextResponse.json({ success: true, transfers: created, count: created.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[BULK_TRANSFER]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
