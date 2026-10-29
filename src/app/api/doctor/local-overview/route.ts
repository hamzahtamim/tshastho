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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    todayEarn,
    monthEarn,
    totalEarn,
    todayPrescriptions,
    monthPrescriptions,
    totalLocalPatients,
    todayPlatformEarnings,
    monthPlatformEarnings,
    chambers,
    recentPrescriptions,
    todayList,
    monthList,
  ] = await Promise.all([
    prisma.walkInEarning.aggregate({
      where: { doctorId: doctor.id, status: 'RECORDED', earningDate: { gte: today, lt: tomorrow } },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.walkInEarning.aggregate({
      where: { doctorId: doctor.id, status: 'RECORDED', earningDate: { gte: monthStart } },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.walkInEarning.aggregate({
      where: { doctorId: doctor.id, status: 'RECORDED' },
      _sum: { amount: true }, _count: { _all: true },
    }),
    prisma.localPrescription.count({
      where: { doctorId: doctor.id, visitDate: { gte: today, lt: tomorrow } },
    }),
    prisma.localPrescription.count({
      where: { doctorId: doctor.id, visitDate: { gte: monthStart } },
    }),
    prisma.localPatient.count({ where: { doctorId: doctor.id } }),
    prisma.doctorEarning.aggregate({
      where: { doctorId: doctor.id, createdAt: { gte: today } },
      _sum: { netAmount: true }, _count: { _all: true },
    }),
    prisma.doctorEarning.aggregate({
      where: { doctorId: doctor.id, createdAt: { gte: monthStart } },
      _sum: { netAmount: true }, _count: { _all: true },
    }),
    prisma.doctorChamber.findMany({
      where: { doctorId: doctor.id, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    }),
    prisma.localPrescription.findMany({
      where: { doctorId: doctor.id },
      orderBy: { visitDate: 'desc' },
      take: 5,
      include: { localPatient: { select: { id: true, name: true } } },
    }),
    prisma.walkInEarning.findMany({
      where: { doctorId: doctor.id, status: 'RECORDED', earningDate: { gte: today, lt: tomorrow } },
      orderBy: { earningDate: 'desc' },
      include: { chamber: { select: { name: true } } },
    }),
    prisma.walkInEarning.findMany({
      where: { doctorId: doctor.id, status: 'RECORDED', earningDate: { gte: monthStart } },
      orderBy: { earningDate: 'desc' },
      include: { chamber: { select: { name: true } } },
    }),
  ]);

  // Chamber-wise breakdown for current month
  const chamberBreakdown: any = {};
  monthList.forEach((e) => {
    const key = e.chamber?.name || 'No Chamber';
    if (!chamberBreakdown[key]) chamberBreakdown[key] = { amount: 0, count: 0 };
    chamberBreakdown[key].amount += Number(e.amount);
    chamberBreakdown[key].count++;
  });

  return NextResponse.json({
    success: true,
    today: {
      walkInEarnings: Number(todayEarn._sum.amount || 0),
      walkInCount: todayEarn._count._all,
      prescriptions: todayPrescriptions,
      platformEarnings: Number(todayPlatformEarnings._sum.netAmount || 0),
      platformCount: todayPlatformEarnings._count._all,
      totalIncome: Number(todayEarn._sum.amount || 0) + Number(todayPlatformEarnings._sum.netAmount || 0),
    },
    month: {
      walkInEarnings: Number(monthEarn._sum.amount || 0),
      walkInCount: monthEarn._count._all,
      prescriptions: monthPrescriptions,
      platformEarnings: Number(monthPlatformEarnings._sum.netAmount || 0),
      platformCount: monthPlatformEarnings._count._all,
      totalIncome: Number(monthEarn._sum.amount || 0) + Number(monthPlatformEarnings._sum.netAmount || 0),
      chamberBreakdown,
    },
    lifetime: {
      walkInEarnings: Number(totalEarn._sum.amount || 0),
      walkInCount: totalEarn._count._all,
    },
    counts: {
      localPatients: totalLocalPatients,
      chambers: chambers.length,
    },
    chambers,
    recentPrescriptions,
    todayEarningsList: todayList,
  });
}
