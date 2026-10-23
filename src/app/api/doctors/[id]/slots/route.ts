import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/doctor/schedule';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get('date');

  if (!date) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'date query required (YYYY-MM-DD)', 400);
  }

  try {
    const slots = await getAvailableSlots(id, date);
    return NextResponse.json({ success: true, slots, date });
  } catch (error) {
    console.error('[SLOTS]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to get slots', 500);
  }
}
