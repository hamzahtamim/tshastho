import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, method, trxId } = await req.json();
    
    if (!amount || !method || !trxId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const request = await prisma.topUpRequest.create({
      data: {
        userId: user.id,
        amount: Number(amount),
        method,
        trxId,
        status: 'PENDING',
      }
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error('[MANUAL_TOPUP]', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
