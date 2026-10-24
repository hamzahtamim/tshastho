import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['sslcommerz_store_id', 'sslcommerz_store_pass', 'sslcommerz_sandbox'] } }
    });
    const config: any = {};
    settings.forEach(s => config[s.key] = s.value);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { storeId, storePass, sandbox } = body;

    const settings = [
      { key: 'sslcommerz_store_id', value: storeId || '' },
      { key: 'sslcommerz_store_pass', value: storePass || '' },
      { key: 'sslcommerz_sandbox', value: sandbox ? 'true' : 'false' },
    ];

    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
