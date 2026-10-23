import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['APPROVE', 'PAID', 'CANCEL']),
  paidAmount: z.coerce.number().min(0).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const payroll = await prisma.staffPayroll.findUnique({ where: { id } });
    if (!payroll) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const update: any = {};
    if (data.action === 'APPROVE') {
      update.status = 'APPROVED';
      update.approvedById = user.id;
      update.approvedAt = new Date();
    } else if (data.action === 'PAID') {
      update.status = 'PAID';
      update.paidAmount = data.paidAmount ?? payroll.netPayable;
      update.paidAt = new Date();
    } else if (data.action === 'CANCEL') {
      update.status = 'CANCELLED';
    }

    const updated = await prisma.staffPayroll.update({ where: { id }, data: update });
    return NextResponse.json({ success: true, payroll: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
