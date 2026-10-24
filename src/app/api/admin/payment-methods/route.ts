import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const methods = await prisma.paymentMethodConfig.findMany({
      orderBy: { method: 'asc' },
    });
    return NextResponse.json({ success: true, methods });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, method, accountNumber, accountName, accountType, instructions, isActive } = body;
    const finalIsActive = isActive !== undefined ? isActive : true;

    const updated = await prisma.paymentMethodConfig.upsert({
      where: { method: method },
      update: { accountNumber, accountName, accountType, instructions, isActive: finalIsActive },
      create: { method, accountNumber, accountName, accountType, instructions, isActive: finalIsActive },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}
