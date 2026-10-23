import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  specialty: z.string().min(2),
  licenseNumber: z.string().min(3),
  experience: z.coerce.number().int().min(0),
  consultationFee: z.coerce.number().min(0),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = rateLimit(ip);
    if (!limit.success) return errorResponse(ErrorCodes.RATE_LIMITED, 'Too many requests', 429);

    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'Email already exists', 409);

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        role: 'DOCTOR',
        status: "PENDING",
        doctorProfile: {
          create: {
            specialty: data.specialty,
            licenseNumber: data.licenseNumber,
            experience: data.experience,
            consultationFee: data.consultationFee,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Doctor registration submitted for approval', userId: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    console.error('[DOCTOR_REGISTER]', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
}
