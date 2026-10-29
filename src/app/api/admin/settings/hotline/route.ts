import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'hotline_number' } });
  return NextResponse.json({ success: true, hotlineNumber: setting?.value || '01737326555' });
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;
  try {
    const { hotlineNumber } = await req.json();
    await prisma.systemSetting.upsert({
      where: { key: 'hotline_number' },
      update: { value: hotlineNumber },
      create: { key: 'hotline_number', value: hotlineNumber }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
