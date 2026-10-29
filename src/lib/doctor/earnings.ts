import { prisma } from '@/lib/prisma';

export async function getEarningsSummary(doctorId: string) {
  // 1. Get all earnings
  const earnings = await prisma.doctorEarning.findMany({
    where: { doctorId },
  });

  // 2. Get pending/requested payouts
  const pendingPayouts = await prisma.doctorPayout.aggregate({
    where: {
      doctorId,
      status: 'REQUESTED' as any,
    },
    _sum: { amount: true },
  });

  const totalRequested = Number(pendingPayouts._sum.amount || 0);

  // 3. Calculate totals
  const pending = earnings.filter(e => e.status === 'PENDING');
  const available = earnings.filter(e => e.status === 'AVAILABLE');
  const paid = earnings.filter(e => e.status === 'PAID');

  const sum = (arr: any[]) => arr.reduce((acc, curr) => acc + Number(curr.netAmount), 0);

  const pendingAmount = sum(pending);
  const availableAmount = Math.max(0, sum(available) - totalRequested); // Deduct requested amount
  const paidAmount = sum(paid);

  return {
    pending: { amount: pendingAmount, count: pending.length },
    available: { amount: availableAmount, count: available.length },
    paid: { amount: paidAmount, count: paid.length },
    lifetime: {
      gross: earnings.reduce((acc, curr) => acc + Number(curr.grossAmount), 0),
      platformFee: earnings.reduce((acc, curr) => acc + Number(curr.platformFee), 0),
      net: earnings.reduce((acc, curr) => acc + Number(curr.netAmount), 0),
      count: earnings.length,
    }
  };
}

export async function recordAppointmentEarning(data: {
  doctorId: string;
  appointmentId: string;
  patientId: string;
  grossAmount: number;
  platformFee?: number;
  netAmount?: number;
}) {
  const platformFee = data.platformFee || 0;
  const netAmount = data.netAmount || (data.grossAmount - platformFee);
  
  return prisma.doctorEarning.create({
    data: {
      doctorId: data.doctorId,
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      grossAmount: data.grossAmount,
      platformFee: platformFee,
      netAmount: netAmount,
      status: 'PENDING' as any,
    }
  });
}
