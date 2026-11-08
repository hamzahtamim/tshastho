import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isVerified: true,
        address: true,
        avatarUrl: true,
        myReferralCode: true, // Added avatar
        createdAt: true,
        patientProfile: {
          select: {
            bloodGroup: true,
            address: true,
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[USER_PROFILE_GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, phone, address, avatarUrl, bloodGroup } = body;

    // ১. User টেবিলে আপডেট (নাম, ফোন, ঠিকানা, ছবি)
    const updatedUser = await prisma.user.update({
      where: { id: auth.user!.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
        ...(avatarUrl !== undefined && { avatarUrl }), // Avatar URL সেভ করা হচ্ছে
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        address: true,
        avatarUrl: true,
      },
    });

    // ২. Patient টেবিলে আপডেট বা তৈরি (Upsert)
    if (bloodGroup !== undefined || address !== undefined) {
      await prisma.patient.upsert({
        where: { userId: auth.user!.id },
        update: {
          ...(bloodGroup !== undefined && { bloodGroup }),
          ...(address !== undefined && { address }),
        },
        create: {
          userId: auth.user!.id,
          bloodGroup: bloodGroup || null,
          address: address || null,
        }
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[USER_PROFILE_PUT]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
