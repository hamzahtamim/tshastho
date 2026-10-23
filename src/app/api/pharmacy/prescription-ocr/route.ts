import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { extractPrescription } from '@/lib/ocr';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({ imageUrl: z.string().url() });

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const job = await prisma.prescriptionOcrJob.create({
      data: { userId: user.id, imageUrl: data.imageUrl, status: 'PROCESSING' },
    });

    const result = await extractPrescription(data.imageUrl);

    const updated = await prisma.prescriptionOcrJob.update({
      where: { id: job.id },
      data: {
        extractedText: result.text,
        extractedItems: result.items,
        status: result.error ? 'FAILED' : (result.items.length > 0 ? 'COMPLETED' : 'MANUAL_REVIEW'),
        provider: result.provider,
        confidence: result.confidence,
        errorMessage: result.error || null,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, job: updated }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    console.error('[OCR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const jobs = await prisma.prescriptionOcrJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ success: true, jobs });
}
