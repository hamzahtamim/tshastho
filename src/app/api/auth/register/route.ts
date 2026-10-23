import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, createSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = rateLimit(ip);
    if (!limit.success) {
      return errorResponse(ErrorCodes.RATE_LIMITED, 'Too many requests. Please try again later.', 429);
    }

    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return errorResponse(ErrorCodes.CONFLICT, 'User with this email already exists', 409);
    }

    const hashedPassword = await hashPassword(validatedData.password);

    // Build data object — only include phone if provided
    const userData: any = {
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: 'CUSTOMER',
      status: 'APPROVED',
    };

    if (validatedData.phone) {
      userData.phone = validatedData.phone;
    }

    const user = await prisma.user.create({ data: userData });

    const token = await generateToken({ id: user.id, email: user.email, role: user.role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    await createSession(user.id, token, expiresAt);

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REGISTER_ERROR]', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
}
