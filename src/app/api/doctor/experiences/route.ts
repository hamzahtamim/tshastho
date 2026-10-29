import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  const experiences = await prisma.doctorExperience.findMany({
    where: { doctorId: doctor.id },
    orderBy: { startYear: 'desc' }
  });
  return NextResponse.json({ success: true, experiences });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DOCTOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

  try {
    const body = await req.json();
    const exp = await prisma.doctorExperience.create({
      data: {
        doctorId: doctor.id,
        hospitalName: body.hospitalName,
        designation: body.designation,
        startYear: Number(body.startYear),
        endYear: body.endYear ? Number(body.endYear) : null,
        isCurrent: body.isCurrent || false,
      }
    });
    return NextResponse.json({ success: true, experience: exp });
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
    await prisma.doctorExperience.deleteMany({
      where: { id: id || '', doctor: { userId: user.id } }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
