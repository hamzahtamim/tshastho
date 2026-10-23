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

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  const url = new URL(req.url);
  const month = url.searchParams.get('month');

  const where: any = { pharmacyId };
  if (month) where.month = month;

  const payrolls = await prisma.staffPayroll.findMany({
    where,
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      staff: { select: { id: true, name: true, email: true, phone: true, staffRole: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, payrolls });
}

const schema = z.object({
  staffId: z.string().min(1),
  month: z.string().min(7), // YYYY-MM
  basicSalary: z.coerce.number().min(0).default(0),
  presentDays: z.coerce.number().int().min(0).default(0),
  absentDays: z.coerce.number().int().min(0).default(0),
  leaveDays: z.coerce.number().int().min(0).default(0),
  workingDays: z.coerce.number().int().min(1).default(30),
  commissionAmount: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  overtime: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  advanceDeducted: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const staff = await prisma.user.findUnique({ where: { id: data.staffId } });
    if (!staff) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Staff not found', 404);

    // Auto-calculate from attendance
    const monthStart = new Date(data.month + '-01');
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const attendances = await prisma.staffAttendance.findMany({
      where: {
        staffId: data.staffId,
        checkInAt: { gte: monthStart, lt: monthEnd },
      },
    });

    const presentDays = data.presentDays || attendances.length;
    const workingDays = data.workingDays || 30;
    const basicSalary = data.basicSalary || Number(staff.basicSalary || 0);
    const dailyRate = workingDays > 0 ? basicSalary / workingDays : 0;
    const earnedBasic = dailyRate * presentDays;

    const netPayable =
      earnedBasic +
      data.commissionAmount +
      data.bonus +
      data.overtime -
      data.deductions -
      data.advanceDeducted;

    const existing = await prisma.staffPayroll.findUnique({
      where: { pharmacyId_staffId_month: { pharmacyId, staffId: data.staffId, month: data.month } },
    });

    let payroll;
    if (existing) {
      payroll = await prisma.staffPayroll.update({
        where: { id: existing.id },
        data: {
          basicSalary,
          presentDays,
          absentDays: data.absentDays,
          leaveDays: data.leaveDays,
          workingDays,
          dailyRate,
          earnedBasic,
          commissionAmount: data.commissionAmount,
          bonus: data.bonus,
          overtime: data.overtime,
          deductions: data.deductions,
          advanceDeducted: data.advanceDeducted,
          netPayable,
          notes: data.notes || null,
        },
      });
    } else {
      payroll = await prisma.staffPayroll.create({
        data: {
          pharmacyId,
          staffId: data.staffId,
          month: data.month,
          basicSalary,
          presentDays,
          absentDays: data.absentDays,
          leaveDays: data.leaveDays,
          workingDays,
          dailyRate,
          earnedBasic,
          commissionAmount: data.commissionAmount,
          bonus: data.bonus,
          overtime: data.overtime,
          deductions: data.deductions,
          advanceDeducted: data.advanceDeducted,
          netPayable,
          notes: data.notes || null,
          status: 'DRAFT',
        },
      });
    }

    return NextResponse.json({ success: true, payroll }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PAYROLL]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
