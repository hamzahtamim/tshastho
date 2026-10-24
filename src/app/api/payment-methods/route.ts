import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const methods = await prisma.paymentMethodConfig.findMany({
      where: { isActive: true },
      orderBy: { method: 'asc' },
    });
    return NextResponse.json({ success: true, methods });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}
