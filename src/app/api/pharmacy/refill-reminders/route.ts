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
  customerId: z.string().min(1),
  medicineId: z.string().min(1),
  reminderDate: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const reminders = await prisma.customerRefillReminder.findMany({
    where: { pharmacyId, isDismissed: false },
    orderBy: { reminderDate: 'asc' },
    take: 200,
    include: {
      medicine: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ success: true, reminders });
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

    const reminder = await prisma.customerRefillReminder.create({
      data: {
        pharmacyId,
        customerId: data.customerId,
        medicineId: data.medicineId,
        reminderDate: new Date(data.reminderDate),
        notes: data.notes || null,
      },
    });

    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
