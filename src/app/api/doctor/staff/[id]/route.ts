import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  role: z.enum(['RECEPTIONIST', 'ASSISTANT', 'NURSE', 'COMPOUNDER', 'MANAGER', 'OTHER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED']).optional(),
  permissions: z.object({
    canViewAppointments: z.boolean().default(true),
    canBookAppointments: z.boolean().default(true),
    canCreateLocalRx: z.boolean().default(false),
    canRecordEarnings: z.boolean().default(false),
    canViewPatients: z.boolean().default(true),
    canEditPatients: z.boolean().default(false),
  }).optional(),
  notes: z.string().optional(),
  chamberIds: z.array(z.string()).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const staff = await prisma.doctorStaff.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      chamberAssignments: { include: { chamber: true } },
      attendances: { orderBy: { checkInAt: 'desc' }, take: 30 },
    },
  });

  if (!staff) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Staff not found', 404);

  if (user.role !== 'SUPER_ADMIN') {
    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    if (!doctor || staff.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
    }
  }

  return NextResponse.json({ success: true, staff });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const staff = await prisma.doctorStaff.findUnique({ where: { id } });
    if (!staff) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Staff not found', 404);

    if (user.role !== 'SUPER_ADMIN') {
      const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
      if (!doctor || staff.doctorId !== doctor.id) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
      }
    }

    const update: any = {};
    if (data.role) update.role = data.role;
    if (data.status) update.status = data.status;
    if (data.permissions) update.permissions = data.permissions;
    if (data.notes !== undefined) update.notes = data.notes;

    // Handle chamber assignments
    if (data.chamberIds !== undefined) {
      await prisma.staffChamberAssignment.deleteMany({ where: { staffId: id } });
      if (data.chamberIds.length > 0) {
        await prisma.staffChamberAssignment.createMany({
          data: data.chamberIds.map((cid) => ({ staffId: id, chamberId: cid })),
        });
      }
    }

    const updated = await prisma.doctorStaff.update({ where: { id }, data: update });

    // If suspended/removed, deactivate user
    if (data.status) {
      await prisma.user.update({
        where: { id: staff.userId },
        data: { isActive: data.status === 'ACTIVE' },
      });
    }

    return NextResponse.json({ success: true, staff: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const staff = await prisma.doctorStaff.findUnique({ where: { id } });
  if (!staff) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Staff not found', 404);

  if (user.role !== 'SUPER_ADMIN') {
    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    if (!doctor || staff.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorStaff.update({
      where: { id },
      data: { status: 'REMOVED', leftAt: new Date() },
    });
    await tx.user.update({
      where: { id: staff.userId },
      data: { isActive: false },
    });
  });

  return NextResponse.json({ success: true });
}
