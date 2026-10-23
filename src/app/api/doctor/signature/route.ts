import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  signatureUrl: z.string().url(),
});

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: { signatureUrl: data.signatureUrl },
    });

    return NextResponse.json({ success: true, signatureUrl: updated.signatureUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { signatureUrl: null },
  });

  return NextResponse.json({ success: true });
}
