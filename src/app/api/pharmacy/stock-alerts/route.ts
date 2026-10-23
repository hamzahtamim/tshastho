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

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  // Auto-generate alerts for low stock
  const lowStock = await prisma.medicine.findMany({
    where: {
      pharmacyId,
      isActive: true,
      stock: { lte: 10 },
    },
    take: 200,
  });

  for (const m of lowStock) {
    const existing = await prisma.stockAlert.findFirst({
      where: { pharmacyId, medicineId: m.id, status: 'PENDING' },
    });
    if (!existing) {
      await prisma.stockAlert.create({
        data: {
          pharmacyId,
          medicineId: m.id,
          currentStock: m.stock,
          reorderLevel: 10,
          suggestedQty: 50,
          status: 'PENDING',
          notifiedAt: new Date(),
        },
      }).catch(() => {});
    } else {
      await prisma.stockAlert.update({
        where: { id: existing.id },
        data: { currentStock: m.stock },
      }).catch(() => {});
    }
  }

  const alerts = await prisma.stockAlert.findMany({
    where: { pharmacyId, status: { in: ['PENDING', 'ORDERED'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { medicine: { select: { id: true, name: true, brand: true } } },
  });

  return NextResponse.json({ success: true, alerts });
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const update: any = { status: data.status, notes: data.notes || null };
    if (data.status === 'ORDERED') update.orderedAt = new Date();
    if (data.status === 'RECEIVED') update.resolvedAt = new Date();

    const alert = await prisma.stockAlert.update({ where: { id: data.id }, data: update });
    return NextResponse.json({ success: true, alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
