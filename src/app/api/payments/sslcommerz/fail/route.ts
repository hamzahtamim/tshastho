import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tranId = formData.get('tran_id') as string | null;
    if (tranId) {
      // SECURITY FIX (P1-10): Do not blindly trust fail callbacks. 
      // The IPN route will securely update the payment status to FAILED.
      console.warn('[SSLCOMMERZ_FAIL] Fail callback received. Awaiting IPN.');
    }
  } catch {}
  return NextResponse.redirect(`${appUrl}/payment/failed`);
}
