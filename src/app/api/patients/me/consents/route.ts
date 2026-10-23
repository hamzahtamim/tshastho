import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  doctorId: z.string().min(1),
  scope: z.enum(['FULL_HISTORY', 'SPECIFIC_REPORTS', 'CURRENT_VISIT', 'PRESCRIPTIONS_ONLY']).default('FULL_HISTORY'),
  expiresAt: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const consents = await prisma.doctorPatientConsent.findMany({
    where: { patientId: user.id },
    orderBy: { grantedAt: 'desc' },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  return NextResponse.json({ success: true, consents });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.doctorPatientConsent.findUnique({
      where: { patientId_doctorId: { patientId: user.id, doctorId: data.doctorId } },
    });

    let consent;
    if (existing) {
      consent = await prisma.doctorPatientConsent.update({
        where: { id: existing.id },
        data: {
          scope: data.scope,
          status: 'ACTIVE',
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          grantedAt: new Date(),
          revokedAt: null,
          revokedReason: null,
        },
      });
    } else {
      consent = await prisma.doctorPatientConsent.create({
        data: {
          patientId: user.id,
          doctorId: data.doctorId,
          scope: data.scope,
          status: 'ACTIVE',
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      });
    }

    return NextResponse.json({ success: true, consent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const reason = url.searchParams.get('reason') || 'Patient revoked';

  if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'id required', 400);

  const consent = await prisma.doctorPatientConsent.findUnique({ where: { id } });
  if (!consent || consent.patientId !== user.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
  }

  await prisma.doctorPatientConsent.update({
    where: { id },
    data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason },
  });

  return NextResponse.json({ success: true });
}
