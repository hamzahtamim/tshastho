import { prisma } from '@/lib/prisma';
import { getSessionToken, verifySessionToken } from './session';

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

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
