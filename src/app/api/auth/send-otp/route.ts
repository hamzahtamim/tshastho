import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // ৬ ডিজিটের OTP জেনারেট করা
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // ১০ মিনিটের জন্য ভ্যালিড

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry }
    });

    await sendOtpEmail(email, otp);
    console.log(`[OTP SENT] OTP for ${email} is: ${otp}`); // ডেভেলপমেন্টের জন্য লগ

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[SEND_OTP_ERROR]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
