import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, createSession, hashToken } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import crypto from 'crypto';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  referralCode: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
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
    const myReferralCode = 'TSH-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      let referrerId = null;

      // 1. Handle Referral Logic
      if (validatedData.referralCode) {
        const referrer = await tx.user.findUnique({
          where: { myReferralCode: validatedData.referralCode.toUpperCase() }
        });
        
        if (referrer) {
          referrerId = referrer.id;
          
          // Credit Referrer's Wallet (Bonus 50 TK)
          await tx.walletAccount.upsert({
            where: { userId: referrer.id },
            update: {
              balance: { increment: 50 },
              availableBalance: { increment: 50 }
            },
            create: {
              userId: referrer.id,
              balance: 50,
              availableBalance: 50,
              holdBalance: 0
            }
          });
          
          await tx.walletTransaction.create({
            data: {
              walletId: (await tx.walletAccount.findUnique({ where: { userId: referrer.id } }))!.id,
              type: 'REFERRAL',
              direction: 'CREDIT',
              amount: 50,
              balanceBefore: 0, // Simplified for now
              balanceAfter: 50,
              description: `Referral bonus for inviting ${validatedData.name}`,
            }
          });
        }
      }

      // 2. Create User
      const newUser = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          phone: validatedData.phone || null,
          role: 'CUSTOMER',
          status: 'APPROVED',
          agreedToTermsAt: new Date(),
          myReferralCode: myReferralCode,
          referredById: referrerId,
        },
      });

      // 3. Create Patient Profile
      await tx.patient.create({
        data: {
          userId: newUser.id,
          gender: validatedData.gender || null,
        },
      });

      // 4. Create Wallet for new user
      await tx.walletAccount.create({
        data: {
          userId: newUser.id,
          balance: 0,
          availableBalance: 0,
          holdBalance: 0,
        }
      });

      return newUser;
    });

    // Session Setup
    const token = await generateToken({ id: result.id, email: result.email, role: result.role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: result.id, token: hashToken(token), expiresAt },
    });

    await createSession(result.id, token, expiresAt);

    return NextResponse.json({
      success: true,
      user: { id: result.id, name: result.name, email: result.email, role: result.role }
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[REGISTER_ERROR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Internal server error', 500);
  }
}
