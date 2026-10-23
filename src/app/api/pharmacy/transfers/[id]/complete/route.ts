import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { completeTransfer } from '@/lib/pharmacy/transfer';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const result = await completeTransfer({ transferId: id, userId: user.id });
    return NextResponse.json({ success: true, transfer: result });
  } catch (error) {
    console.error('[TRANSFER_COMPLETE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
