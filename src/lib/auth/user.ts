import { prisma } from '@/lib/prisma';
import { getSessionToken, verifySessionToken, hashToken } from './session';

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  // P1-07 FIX: Check if session exists in DB and is not expired
  const session = await prisma.session.findFirst({
    where: {
      token: hashToken(token),
        expiresAt: { gt: new Date() },
    },
  });
  if (!session) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id as string },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isVerified: true,
      address: true,
      parentPharmacyId: true,
      staffRole: true,
      permissions: true,
    },
  });

  if (!user || user.status !== 'APPROVED') {
    return null;
  }
  return user;
}
