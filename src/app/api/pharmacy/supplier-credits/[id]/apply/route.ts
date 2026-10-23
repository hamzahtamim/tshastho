import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { applyCredit } from '@/lib/pharmacy/supplier-credit';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  amount: z.coerce.number().positive(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updated = await applyCredit({
      creditNoteId: id,
      amount: data.amount,
      userId: user.id,
    });

    return NextResponse.json({ success: true, credit: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[APPLY_CREDIT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}
