import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  message: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  const session = await prisma.telemedicineSession.findUnique({ where: { id } });
  if (!session) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const isMember = session.patientId === user.id || (doctor && session.doctorId === doctor.id);
  if (!isMember) return errorResponse(ErrorCodes.FORBIDDEN, 'Not authorized', 403);

  const messages = await prisma.telemedicineMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({ success: true, messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const { id } = await params;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (!data.message && !data.fileUrl) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Message or file required', 400);
    }

    const session = await prisma.telemedicineSession.findUnique({ where: { id } });
    if (!session) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found', 404);

    const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
    const isDoctor = doctor && session.doctorId === doctor.id;
    const isPatient = session.patientId === user.id;

    if (!isDoctor && !isPatient) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not authorized', 403);
    }

    const msg = await prisma.telemedicineMessage.create({
      data: {
        sessionId: id,
        senderId: user.id,
        senderRole: isDoctor ? 'DOCTOR' : 'PATIENT',
        message: data.message || null,
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || null,
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
