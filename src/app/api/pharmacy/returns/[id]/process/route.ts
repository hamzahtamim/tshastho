import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { processReturn } from '@/lib/pharmacy/returns';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const result = await processReturn({ returnId: id, userId: user.id });
    return NextResponse.json({ success: true, return: result });
  } catch (error) {
    console.error('[RETURN_PROCESS]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to process return', 500);
  }
}
