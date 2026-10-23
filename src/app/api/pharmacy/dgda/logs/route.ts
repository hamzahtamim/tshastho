import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getPharmacyId } from '@/lib/pharmacy/branch';
import { getRegulatoryLogs } from '@/lib/pharmacy/dgda';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  logType: z.enum(['INWARD', 'OUTWARD', 'DISPOSAL', 'TRANSFER', 'ADJUSTMENT', 'RETURN']),
  medicineId: z.string().min(1),
  drugSchedule: z.enum(['OTC', 'PRESCRIPTION', 'NARCOTIC', 'CONTROLLED', 'ANTIBIOTIC']),
  batchNumber: z.string().optional(),
  quantity: z.coerce.number().int(),
  supplierName: z.string().optional(),
  customerName: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const schedule = url.searchParams.get('schedule');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const logs = await getRegulatoryLogs({
    pharmacyId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    schedule: schedule || undefined,
  });

  return NextResponse.json({ success: true, logs });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
    if (!medicine || medicine.pharmacyId !== pharmacyId) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Medicine not in your pharmacy', 403);
    }

    const count = await prisma.regulatoryLog.count({ where: { pharmacyId } });
    const logNumber = `RL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const log = await prisma.regulatoryLog.create({
      data: {
        pharmacyId,
        logNumber,
        logType: data.logType,
        medicineId: data.medicineId,
        medicineName: medicine.name,
        drugSchedule: data.drugSchedule,
        batchNumber: data.batchNumber || null,
        quantity: data.quantity,
        supplierName: data.supplierName || null,
        customerName: data.customerName || null,
        doctorName: data.doctorName || null,
        notes: data.notes || null,
        reportedById: user.id,
      },
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create log', 500);
  }
}
