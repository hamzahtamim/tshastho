import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { getPharmacyId, ensureMainBranch } from '@/lib/pharmacy/branch';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  address: z.string().min(3),
  area: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  await ensureMainBranch(pharmacyId);

  const branches = await prisma.pharmacyBranch.findMany({
    where: { pharmacyId },
    orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }],
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { staffAssign: true, stocks: true } },
    },
  });

  return NextResponse.json({ success: true, branches });
}

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pharmacyId = await getPharmacyId(user);
    if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

    const existing = await prisma.pharmacyBranch.findFirst({
      where: { pharmacyId, code: data.code.toUpperCase() },
    });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Branch code already exists', 409);

    const branch = await prisma.pharmacyBranch.create({
      data: {
        pharmacyId,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address,
        area: data.area || null,
        city: data.city || null,
        phone: data.phone || null,
        managerId: data.managerId || null,
      },
    });

    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create branch', 500);
  }
}
