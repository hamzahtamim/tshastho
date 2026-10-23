import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { requestPayout } from '@/lib/doctor/earnings';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  amount: z.coerce.number().min(0).optional(),
  method: z.string().min(1),
  accountInfo: z.object({
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountName: z.string().optional(),
    branchName: z.string().optional(),
    bkashNumber: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const payouts = await prisma.doctorPayout.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ success: true, payouts });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const payout = await requestPayout({
      doctorId: doctor.id,
      amount: data.amount,
      method: data.method,
      accountInfo: data.accountInfo || {},
      notes: data.notes,
    });

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[PAYOUT_REQUEST]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
