import { NextResponse } from 'next/server';
import { convertAmount } from '@/lib/currency';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const amount = Number(url.searchParams.get('amount') || 0);
  const from = url.searchParams.get('from') || 'BDT';
  const to = url.searchParams.get('to') || 'USD';

  if (!amount || amount <= 0) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'amount required', 400);

  try {
    const converted = await convertAmount(amount, from, to);
    return NextResponse.json({ success: true, amount, from, to, converted: Number(converted.toFixed(4)) });
  } catch (e) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, e.message, 500);
  }
}
