import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken, createSession, hashToken } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json();
    if (!access_token) return NextResponse.json({ message: 'No access token provided' }, { status: 400 });

    // ১. Access Token দিয়ে গুগল থেকে ইউজারের ডেটা আনা
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!googleRes.ok) {
      return NextResponse.json({ message: 'Failed to fetch user info from Google' }, { status: 400 });
    }

    const payload = await googleRes.json();
    const { email, name, picture } = payload;

    if (!email) {
      return NextResponse.json({ message: 'Invalid Google token: no email found' }, { status: 400 });
    }

    // ২. ইউজার খোঁজা
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // ৩. নতুন ইউজার তৈরি (গুগল লগইনে পাসওয়ার্ড লাগে না)
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Google User',
          avatarUrl: picture || null,
          role: 'CUSTOMER',
          status: 'APPROVED',
          password: null, // পাসওয়ার্ড অপশনাল
          agreedToTermsAt: new Date(),
        },
      });
      
      // নতুন ইউজারের জন্য পেশেন্ট প্রোফাইল এবং ওয়ালেট তৈরি
      await prisma.patient.create({ data: { userId: user.id } });
      await prisma.walletAccount.create({ data: { userId: user.id, balance: 0, availableBalance: 0, holdBalance: 0 } });
    }

    // ৪. কাস্টম সেশন তৈরি
    const token = await generateToken({ id: user.id, email: user.email, role: user.role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token: hashToken(token), expiresAt },
    });
    await createSession(user.id, token, expiresAt);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[GOOGLE_AUTH_ERROR]', error);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}
