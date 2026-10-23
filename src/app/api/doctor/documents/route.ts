import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const schema = z.object({
  type: z.enum(['LICENSE', 'DEGREE', 'CERTIFICATE', 'NID', 'PHOTO', 'OTHER']),
  title: z.string().optional(),
  fileUrl: z.string().url(),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const documents = await prisma.doctorDocument.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, documents });
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

    const doc = await prisma.doctorDocument.create({
      data: {
        doctorId: doctor.id,
        type: data.type,
        title: data.title || null,
        fileUrl: data.fileUrl,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload', 500);
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

  const doc = await prisma.doctorDocument.findUnique({ where: { id } });
  if (!doc || doc.doctorId !== doctor.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, 'Not your document', 403);
  }

  await prisma.doctorDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
