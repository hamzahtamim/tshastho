import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const session = await prisma.telemedicineSession.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      patient: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!session) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Session not found', 404);

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const isDoctor = doctor && session.doctorId === doctor.id;
  const isPatient = session.patientId === user.id;

  if (!isDoctor && !isPatient) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not authorized', 403);
  }

  const messages = await prisma.telemedicineMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return NextResponse.json({ success: true, session, messages, isDoctor, isPatient });
}

const updateSchema = z.object({
  action: z.enum(['JOIN', 'START', 'END', 'CANCEL', 'MISSED']),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const session = await prisma.telemedicineSession.findUnique({ where: { id } });
    if (!session) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    const isDoctor = doctor && session.doctorId === doctor.id;
    const isPatient = session.patientId === user.id;

    if (!isDoctor && !isPatient) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not authorized', 403);
    }

    const update: any = {};

    if (data.action === 'JOIN') {
      if (isDoctor) {
        update.doctorJoined = true;
        update.doctorJoinedAt = new Date();
      } else {
        update.patientJoined = true;
        update.patientJoinedAt = new Date();
      }
      if (session.status === 'SCHEDULED') update.status = 'WAITING';
    } else if (data.action === 'START') {
      if (!isDoctor) return errorResponse(ErrorCodes.FORBIDDEN, 'Only doctor can start', 403);
      update.status = 'ACTIVE';
      update.startedAt = new Date();
    } else if (data.action === 'END') {
      if (!isDoctor) return errorResponse(ErrorCodes.FORBIDDEN, 'Only doctor can end', 403);
      update.status = 'COMPLETED';
      update.endedAt = new Date();
      if (session.startedAt) {
        update.duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
      }
    } else if (data.action === 'CANCEL') {
      update.status = 'CANCELLED';
    } else if (data.action === 'MISSED') {
      update.status = 'MISSED';
    }

    const updated = await prisma.telemedicineSession.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
