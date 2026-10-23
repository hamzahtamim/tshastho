import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { checkInteractions } from '@/lib/pharmacy/interactions';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  medicineNames: z.array(z.string().min(1)).min(2),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const warnings = await checkInteractions(data.medicineNames);
    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
