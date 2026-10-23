import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const fallback = 'fallback_secret_for_development_only';

  if (!secret || secret === fallback) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET is missing or insecure in production environment.');
    }
    return fallback;
  }
  return secret;
};

const SECRET_KEY = new TextEncoder().encode(getJwtSecret());

export async function createSession(userId: string, token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  
  cookieStore.set('tshastho_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get('tshastho_session')?.value;
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('tshastho_session');
}

export async function generateToken(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
