import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  drug1Name: z.string().min(1),
  drug2Name: z.string().min(1),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED']).default('MODERATE'),
  description: z.string().min(5),
  recommendation: z.string().optional(),
  source: z.string().optional(),
});

export async function GET() {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  const list = await prisma.drugInteraction.findMany({
    where: { isActive: true },
    orderBy: [{ severity: 'asc' }, { drug1Name: 'asc' }],
    take: 500,
  });
  return NextResponse.json({ success: true, interactions: list });
}

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const created = await prisma.drugInteraction.create({
      data: { ...data, severity: data.severity as any },
    });
    return NextResponse.json({ success: true, interaction: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
