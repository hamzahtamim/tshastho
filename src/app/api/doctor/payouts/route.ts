import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  amount: z.coerce.number().min(100, "Minimum payout is 100 BDT"),
  method: z.string().min(1),
  accountNumber: z.string().min(1),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const doctor = await getDoctor(auth.user!);
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  const payouts = await prisma.doctorPayout.findMany({
    where: { doctorId: doctor.id },
    orderBy: { requestedAt: 'desc' },
  });

  return NextResponse.json({ success: true, payouts });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const doctor = await getDoctor(auth.user!);
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Calculate available balance
    const availableEarnings = await prisma.doctorEarning.aggregate({
      where: { doctorId: doctor.id, status: 'AVAILABLE' },
      _sum: { netAmount: true },
    });
    const availableBalance = Number(availableEarnings._sum.netAmount || 0);

    if (data.amount > availableBalance) {
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
    }

    // Generate a unique payout number
    const payoutNumber = 'PAY-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);

    const payout = await prisma.doctorPayout.create({
      data: {
        doctorId: doctor.id,
        payoutNumber,
        amount: data.amount,
        method: data.method,
        accountInfo: { accountNumber: data.accountNumber },
        // Removed status field so it defaults to REQUESTED
      },
    });

    return NextResponse.json({ success: true, payout });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('[PAYOUT_REQUEST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to request payout: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}
