import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'hotline_number' }
    });
    return NextResponse.json({
      success: true,
      hotlineNumber: setting?.value || '01737326555'
    });
  } catch (error) {
    return NextResponse.json({ success: true, hotlineNumber: '01737326555' });
  }
}
