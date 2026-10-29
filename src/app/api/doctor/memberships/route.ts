import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  const memberships = await prisma.doctorMembership.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ success: true, memberships });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  try {
    const body = await req.json();
    const membership = await prisma.doctorMembership.create({
      data: {
        doctorId: doctor.id,
        organization: body.organization,
        role: body.role,
      }
    });
    return NextResponse.json({ success: true, membership });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  try {
    await prisma.doctorMembership.deleteMany({
      where: { id: id || '', doctor: { userId: user.id } }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
