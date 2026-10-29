import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';
import { getDoctorContext } from '@/lib/auth/doctor-context';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function minutesBetween(a: string, b: string) {
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

const schema = z.object({
  action: z.enum(['CHECK_IN', 'CHECK_OUT']),
  staffId: z.string().min(1),
  chamberId: z.string().optional(),
  selfieUrl: z.string().url(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  device: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doctor = await await getDoctorContext(user);
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

    const staff = await prisma.doctorStaff.findUnique({ where: { id: data.staffId } });
    if (!staff || staff.doctorId !== doctor.id) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Not your staff', 403);
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const today = new Date().toISOString().slice(0, 10);

    // Distance calculation from chamber (if chamberId given)
    let distanceM: number | null = null;
    let rule: any = null;

    if (data.chamberId) {
      const chamber = await prisma.doctorChamber.findUnique({ where: { id: data.chamberId } });
      if (chamber && chamber.gpsLatitude && chamber.gpsLongitude) {
        distanceM = haversineMeters(
          Number(chamber.gpsLatitude),
          Number(chamber.gpsLongitude),
          data.latitude,
          data.longitude
        );
      }
      rule = await prisma.staffAttendanceRule.findUnique({ where: { chamberId: data.chamberId } });
    }

    // Radius check
    if (rule && distanceM !== null && distanceM > rule.radiusMeters) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `You are ${distanceM}m away from chamber. Allowed: ${rule.radiusMeters}m`,
        400
      );
    }

    if (data.action === 'CHECK_IN') {
      // Prevent duplicate check-in
      const existing = await prisma.staffAttendance.findFirst({
        where: { staffId: data.staffId, date: today, checkOutAt: null },
      });
      if (existing) {
        return errorResponse(ErrorCodes.CONFLICT, 'Already checked in today', 409);
      }

      // Late calculation
      let isLate = false;
      let lateMinutes = 0;
      if (rule) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const diff = minutesBetween(rule.workingHoursStart, currentTime) - rule.lateGraceMinutes;
        if (diff > 0) {
          isLate = true;
          lateMinutes = diff;
        }
      }

      const att = await prisma.staffAttendance.create({
        data: {
          staffId: data.staffId,
          chamberId: data.chamberId || null,
          date: today,
          checkInSelfie: data.selfieUrl,
          checkInLat: data.latitude,
          checkInLng: data.longitude,
          checkInDistanceM: distanceM,
          checkInDevice: data.device || null,
          checkInIp: ip,
          isLate,
          lateMinutes,
          status: isLate ? 'LATE' : 'PRESENT',
        },
      });

      return NextResponse.json({ success: true, attendance: att }, { status: 201 });
    } else {
      // CHECK_OUT
      const existing = await prisma.staffAttendance.findFirst({
        where: { staffId: data.staffId, date: today, checkOutAt: null },
        orderBy: { checkInAt: 'desc' },
      });
      if (!existing) {
        return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'No active check-in found', 404);
      }

      const totalMs = Date.now() - existing.checkInAt.getTime();
      const totalHours = totalMs / 3600000;

      // Early leave calc
      let isEarlyLeave = false;
      let earlyMinutes = 0;
      if (rule) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const diff = minutesBetween(currentTime, rule.workingHoursEnd);
        if (diff > 0) {
          isEarlyLeave = true;
          earlyMinutes = diff;
        }
      }

      const updated = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          checkOutAt: new Date(),
          checkOutSelfie: data.selfieUrl,
          checkOutLat: data.latitude,
          checkOutLng: data.longitude,
          checkOutDistanceM: distanceM,
          checkOutDevice: data.device || null,
          checkOutIp: ip,
          isEarlyLeave,
          earlyMinutes,
          note: existing.note,
        },
      });

      return NextResponse.json({ success: true, attendance: updated, totalHours: Number(totalHours.toFixed(2)) });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[ATTENDANCE]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed', 500);
  }
}

export async function GET(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN', 'DOCTOR_STAFF']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const doctor = await await getDoctorContext(user);
  if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

  const url = new URL(req.url);
  const staffId = url.searchParams.get('staffId');
  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const where: any = { staff: { doctorId: doctor.id } };
  if (staffId) where.staffId = staffId;
  if (date) where.date = date;
  if (from || to) {
    where.checkInAt = {};
    if (from) where.checkInAt.gte = new Date(from);
    if (to) where.checkInAt.lte = new Date(to);
  }

  const attendance = await prisma.staffAttendance.findMany({
    where,
    orderBy: { checkInAt: 'desc' },
    take: 300,
    include: {
      staff: { include: { user: { select: { id: true, name: true, phone: true } } } },
      chamber: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, attendance });
}
