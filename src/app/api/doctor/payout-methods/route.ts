import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  methodType: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'BANK']),
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(5, 'Valid account number is required'),
  bankName: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  const methods = await prisma.payoutMethod.findMany({
    where: { doctorId: doctor.id },
    orderBy: { isDefault: 'desc' },
  });

  return NextResponse.json({ success: true, methods });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  // KYC CHECK: Doctor must be verified to add payment method
  if (doctor.verificationStatus !== 'VERIFIED') {
    return NextResponse.json({ error: 'Your profile is not verified. Please complete KYC first.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // If setting as default, unset previous defaults
    if (data.isDefault) {
      await prisma.payoutMethod.updateMany({
        where: { doctorId: doctor.id },
        data: { isDefault: false },
      });
    }

    const newMethod = await prisma.payoutMethod.create({
      data: {
        doctorId: doctor.id,
        methodType: data.methodType,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        isDefault: data.isDefault,
        status: 'VERIFIED', // For now auto-verifying, later can be PENDING for admin check
      },
    });

    return NextResponse.json({ success: true, method: newMethod });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: 'Failed to add method' }, { status: 500 });
  }
}
