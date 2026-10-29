import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const specialty = url.searchParams.get('specialty') || '';
  const city = url.searchParams.get('city') || '';
  const online = url.searchParams.get('online') === 'true';
  const minFee = url.searchParams.get('minFee');
  const maxFee = url.searchParams.get('maxFee');
  const sort = url.searchParams.get('sort') || 'rating';
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);

  const where: any = { user: { isActive: true, role: 'DOCTOR' } };

  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { specialty: { contains: q, mode: 'insensitive' } },
      { specialties: { some: { name: { contains: q, mode: 'insensitive' } } } },
    ];
  }
  if (specialty) where.specialties = { some: { name: { contains: specialty, mode: 'insensitive' } } };
  if (city) where.chamberAddress = { contains: city, mode: 'insensitive' };
  if (online) where.onlineAvailable = true;
  if (minFee || maxFee) {
    where.consultationFee = {};
    if (minFee) where.consultationFee.gte = Number(minFee);
    if (maxFee) where.consultationFee.lte = Number(maxFee);
  }

  const orderBy: any =
    sort === 'fee_low' ? { consultationFee: 'asc' } :
    sort === 'fee_high' ? { consultationFee: 'desc' } :
    sort === 'experience' ? { experience: 'desc' } :
    { averageRating: 'desc' };

  const doctors = await prisma.doctor.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      specialties: true,
      qualifications: { orderBy: { year: 'desc' }, take: 3 },
      experiences: { orderBy: { startYear: 'desc' } },
      chambers: { where: { isActive: true }, orderBy: { isPrimary: 'desc' } },
      awards: { orderBy: { year: 'desc' } },
      memberships: true,
    },
  });

  return NextResponse.json({ success: true, doctors, count: doctors.length });
}
