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
  shopName: z.string().min(2),
  drugLicense: z.string().min(3),
  tradeLicense: z.string().min(3),
  address: z.string().min(5),
  area: z.string().min(2),
  city: z.string().min(2),
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
        role: 'PHARMACY_OWNER',
        status: "PENDING",
      },
    });

    await prisma.pharmacy.create({
      data: {
        userId: user.id,
        shopName: data.shopName,
        drugLicense: data.drugLicense,
        tradeLicense: data.tradeLicense,
        address: data.address,
        area: data.area,
        city: data.city,
      },
    });

    return NextResponse.json({ success: true, message: 'Pharmacy registration submitted for approval', userId: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    console.error('[PHARMACY_REGISTER]', error instanceof Error ? error.message : 'Unknown error');
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
}
