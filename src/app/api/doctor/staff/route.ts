import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

async function getDoctor(user: any) {
  return await getDoctorContext(user);
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['RECEPTIONIST', 'ASSISTANT', 'NURSE', 'COMPOUNDER', 'MANAGER', 'OTHER']).default('ASSISTANT'),
  permissions: z.object({
    canViewAppointments: z.boolean().default(true),
    canBookAppointments: z.boolean().default(true),
    canCreateLocalRx: z.boolean().default(false),
    canRecordEarnings: z.boolean().default(false),
    canViewPatients: z.boolean().default(true),
    canEditPatients: z.boolean().default(false),
  }).optional(),
  chamberIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const staff = await prisma.doctorStaff.findMany({
    where: { doctorId: doctor.id, status: { not: 'REMOVED' } },
    orderBy: { joinedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
      chamberAssignments: {
        include: { chamber: { select: { id: true, name: true } } },
      },
      attendances: {
        orderBy: { checkInAt: 'desc' },
        take: 5,
      },
    },
  });

  return NextResponse.json({ success: true, staff });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Email already registered', 409);

    const hashed = await hashPassword(data.password);
    const defaultPerms = {
      canViewAppointments: true,
      canBookAppointments: true,
      canCreateLocalRx: false,
      canRecordEarnings: false,
      canViewPatients: true,
      canEditPatients: false,
    };

    const result = await prisma.$transaction(async (tx) => {
      const staffUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          password: hashed,
          role: 'DOCTOR_STAFF',
          status: 'APPROVED',
          parentPharmacyId: null,
          isActive: true,
          staffRole: data.role,
        },
      });

      const staff = await tx.doctorStaff.create({
        data: {
          doctorId: doctor.id,
          userId: staffUser.id,
          role: data.role as any,
          status: 'ACTIVE',
          permissions: data.permissions || defaultPerms,
          notes: data.notes || null,
        },
      });

      if (data.chamberIds && data.chamberIds.length > 0) {
        await tx.staffChamberAssignment.createMany({
          data: data.chamberIds.map((cid) => ({
            staffId: staff.id,
            chamberId: cid,
          })),
        });
      }

      return { staff, staffUser };
    });

    return NextResponse.json({
      success: true,
      staff: result.staff,
      credentials: { email: data.email, password: data.password },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[STAFF_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
