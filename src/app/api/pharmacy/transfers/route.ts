import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getPharmacyId } from '@/lib/pharmacy/branch';
import { getNextTransferNumber } from '@/lib/pharmacy/transfer';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  reason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  const where: any = { pharmacyId };
  if (status) where.status = status;

  const transfers = await prisma.branchTransfer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      fromBranch: { select: { id: true, name: true, code: true } },
      toBranch: { select: { id: true, name: true, code: true } },
      items: { include: { medicine: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ success: true, transfers });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (data.fromBranchId === data.toBranchId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Source and destination must be different', 400);
    }

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const [from, to] = await Promise.all([
      prisma.pharmacyBranch.findUnique({ where: { id: data.fromBranchId } }),
      prisma.pharmacyBranch.findUnique({ where: { id: data.toBranchId } }),
    ]);
    if (!from || !to || from.pharmacyId !== pharmacyId || to.pharmacyId !== pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Invalid branches', 403);
    }

    const medicineIds = data.items.map(i => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds }, pharmacyId },
    });
    if (medicines.length !== medicineIds.length) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Some medicines not found', 400);
    }

    const transferNumber = await getNextTransferNumber(pharmacyId);

    const transfer = await prisma.branchTransfer.create({
      data: {
        transferNumber,
        pharmacyId,
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        status: "PENDING",
        reason: data.reason || null,
        notes: data.notes || null,
        requestedById: user.id,
        items: {
          create: data.items.map(i => ({
            medicineId: i.medicineId,
            medicineName: medicines.find(m => m.id === i.medicineId)!.name,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, transfer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[TRANSFER_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to create transfer', 500);
  }
}
