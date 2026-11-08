import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    if (user.isVerified) return NextResponse.json({ message: 'User already verified' }, { status: 400 });

    if (user.otpCode !== otp) {
      return NextResponse.json({ message: 'Invalid OTP code' }, { status: 400 });
    }

    if (!user.otpExpiry || new Date(user.otpExpiry) < new Date()) {
      return NextResponse.json({ message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // OTP সঠিক হলে ইউজারকে ভেরিফাইড করা এবং OTP মুছে ফেলা
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiry: null }
    });

    return NextResponse.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('[VERIFY_OTP_ERROR]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
