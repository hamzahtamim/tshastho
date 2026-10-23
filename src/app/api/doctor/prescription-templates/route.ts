import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getDoctor(user: any) {
  return prisma.doctor.findFirst({ where: { userId: user.id } });
}

const itemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.string().optional(),
  beforeAfterMeal: z.string().optional(),
  instructions: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(2),
  chiefComplaint: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  investigations: z.string().optional(),
  advice: z.string().optional(),
  isPublic: z.boolean().default(false),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await getDoctor(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const templates = await prisma.prescriptionTemplate.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    include: { items: { orderBy: { orderIndex: 'asc' } } },
  });

  return NextResponse.json({ success: true, templates });
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

    const template = await prisma.prescriptionTemplate.create({
      data: {
        doctorId: doctor.id,
        name: data.name,
        chiefComplaint: data.chiefComplaint || null,
        examination: data.examination || null,
        diagnosis: data.diagnosis || null,
        investigations: data.investigations || null,
        advice: data.advice || null,
        isPublic: data.isPublic,
        items: {
          create: data.items.map((item, idx) => ({
            medicineName: item.medicineName,
            strength: item.strength || null,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: item.quantity || null,
            beforeAfterMeal: item.beforeAfterMeal || null,
            instructions: item.instructions || null,
            orderIndex: idx,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[TEMPLATE_CREATE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
