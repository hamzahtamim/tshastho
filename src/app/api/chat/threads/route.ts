import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({ doctorId: z.string().min(1) });

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const where = doctor ? { doctorId: doctor.id } : { patientId: user.id };

  const threads = await prisma.chatThread.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    include: {
      doctor: { include: { user: { select: { id: true, name: true } } } },
      patient: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  return NextResponse.json({ success: true, threads, isDoctor: !!doctor });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.chatThread.findUnique({
      where: { doctorId_patientId: { doctorId: data.doctorId, patientId: user.id } },
    });
    if (existing) return NextResponse.json({ success: true, thread: existing });

    const thread = await prisma.chatThread.create({
      data: { doctorId: data.doctorId, patientId: user.id },
    });

    return NextResponse.json({ success: true, thread }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
