import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { getDoctorContext } from '@/lib/auth/doctor-context';

export async function GET() {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const today = new Date().toISOString().slice(0, 10);

  const [allStaff, todayAttendance] = await Promise.all([
    prisma.doctorStaff.findMany({
      where: { doctorId: doctor.id, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        chamberAssignments: { include: { chamber: { select: { id: true, name: true } } } },
      },
    }),
    prisma.staffAttendance.findMany({
      where: { staff: { doctorId: doctor.id }, date: today },
      include: {
        staff: { include: { user: { select: { name: true } } } },
        chamber: { select: { name: true } },
      },
    }),
  ]);

  const staffStatus = allStaff.map((s) => {
    const todayAtt = todayAttendance.find((a) => a.staffId === s.id);
    return {
      staffId: s.id,
      name: s.user.name,
      phone: s.user.phone,
      role: s.role,
      chambers: s.chamberAssignments.map((c) => c.chamber),
      attendance: todayAtt ? {
        checkInAt: todayAtt.checkInAt,
        checkOutAt: todayAtt.checkOutAt,
        status: todayAtt.status,
        isLate: todayAtt.isLate,
        lateMinutes: todayAtt.lateMinutes,
        isEarlyLeave: todayAtt.isEarlyLeave,
        chamber: todayAtt.chamber?.name,
        isPresent: !todayAtt.checkOutAt,
      } : null,
    };
  });

  return NextResponse.json({ success: true, staff: staffStatus, today });
}
