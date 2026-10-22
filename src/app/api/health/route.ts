import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[HEALTH_CHECK_FAILED]', error);
    return NextResponse.json({ status: 'degraded' }, { status: 503 });
  }
}
