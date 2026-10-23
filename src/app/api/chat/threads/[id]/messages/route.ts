import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({ message: z.string().min(1) });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const thread = await prisma.chatThread.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      patient: { select: { name: true, phone: true } },
    },
  });
  if (!thread) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const isDoctor = doctor && thread.doctorId === doctor.id;
  const isPatient = thread.patientId === user.id;
  if (!isDoctor && !isPatient) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);

  // Mark unread as read
  await prisma.$transaction([
    prisma.chatMessage.updateMany({
      where: { threadId: id, senderId: { not: user.id } },
      data: { isRead: true, readAt: new Date() },
    }),
    prisma.chatThread.update({
      where: { id },
      data: isDoctor ? { doctorUnread: 0 } : { patientUnread: 0 },
    }),
  ]);

  const messages = await prisma.chatMessage.findMany({
    where: { threadId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({ success: true, thread, messages, isDoctor, isPatient });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const thread = await prisma.chatThread.findUnique({ where: { id } });
    if (!thread) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    const isDoctor = doctor && thread.doctorId === doctor.id;
    const isPatient = thread.patientId === user.id;
    if (!isDoctor && !isPatient) return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);

    const msg = await prisma.chatMessage.create({
      data: {
        threadId: id,
        senderId: user.id,
        senderRole: isDoctor ? 'DOCTOR' : 'PATIENT',
        message: data.message,
      },
    });

    await prisma.chatThread.update({
      where: { id },
      data: {
        lastMessage: data.message.slice(0, 100),
        lastMessageAt: new Date(),
        ...(isDoctor ? { patientUnread: { increment: 1 } } : { doctorUnread: { increment: 1 } }),
      },
    });

    return NextResponse.json({ success: true, message: msg }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
