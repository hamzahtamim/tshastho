import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  chamberId: z.string().optional(),
  localPatientId: z.string().optional(),
  patientName: z.string().optional(),
  amount: z.coerce.number().positive(),
  method: z.string().default('CASH'),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  earningDate: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const chamberId = url.searchParams.get('chamberId');
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 1000);

  const where: any = { doctorId: doctor.id, status: 'RECORDED' };
  if (from || to) {
    where.earningDate = {};
    if (from) where.earningDate.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.earningDate.lte = toDate;
    }
  }
  if (chamberId) where.chamberId = chamberId;

  const [earnings, summary] = await Promise.all([
    prisma.walkInEarning.findMany({
      where,
      orderBy: { earningDate: 'desc' },
      take: limit,
      include: {
        chamber: { select: { id: true, name: true } },
        localPatient: { select: { id: true, name: true } },
      },
    }),
    prisma.walkInEarning.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    earnings,
    summary: {
      total: Number(summary._sum.amount || 0),
      count: summary._count._all,
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const earning = await prisma.walkInEarning.create({
      data: {
        doctorId: doctor.id,
        chamberId: data.chamberId || null,
        localPatientId: data.localPatientId || null,
        patientName: data.patientName || null,
        amount: data.amount,
        method: data.method,
        serviceType: data.serviceType || null,
        description: data.description || null,
        earningDate: data.earningDate ? new Date(data.earningDate) : new Date(),
      },
    });

    return NextResponse.json({ success: true, earning }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing id', 400);

  const earning = await prisma.walkInEarning.findUnique({ where: { id } });
  if (!earning || earning.doctorId !== doctor.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not yours', 403);
  }

  await prisma.walkInEarning.update({
    where: { id },
    data: { status: 'VOIDED', voidedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
