import { prisma } from '@/lib/prisma';
import { getSessionToken, verifySessionToken, hashToken } from './session';

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  // P1-07 FIX: Check if session exists in DB and is not expired
  const session = await prisma.session.findFirst({
    where: { token: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: true } // ইউজার ডেটাও একসাথে নিয়ে আসা
  });
  if (!session) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.id) return null;

  const user = session?.user;

  if (!user || user.status !== 'APPROVED') {
    return null;
  }
  return user;
}
