import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const { id } = await params;

  const attendance = await prisma.staffAttendance.findMany({
    where: { staffId: id },
    orderBy: { checkInAt: 'desc' },
    take: 60,
  });

  return NextResponse.json({ success: true, attendance });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const { id } = await params;

  const today = todayStr();
  const existing = await prisma.staffAttendance.findFirst({
    where: { staffId: id, date: today, checkOutAt: null },
  });

  if (existing) {
    // Check out
    const updated = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date() },
    });
    return NextResponse.json({ success: true, attendance: updated, action: 'CHECKOUT' });
  }

  // Check in
  const created = await prisma.staffAttendance.create({
    data: { staffId: id, date: today },
  });
  return NextResponse.json({ success: true, attendance: created, action: 'CHECKIN' }, { status: 201 });
}
