import { prisma } from '@/lib/prisma';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export type SlotInfo = {
  startTime: string;
  endTime: string;
  slotType: string;
  chamberAddress: string;
  chamberId?: string;
  chamberName?: string;
  consultationFee?: number;
  bookedCount: number;
  maxPatients: number;
  isAvailable: boolean;
  scheduleId?: string;
  overrideId?: string;
};

export async function getAvailableSlots(doctorId: string, dateStr: string): Promise<SlotInfo[]> {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const leave = await prisma.doctorLeave.findFirst({
    where: {
      doctorId,
      status: 'APPROVED',
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
  if (leave) return [];

  const overrides = await prisma.doctorSlotOverride.findMany({
    where: { doctorId, date: { gte: date, lt: nextDay } },
  });

  if (overrides.some(o => o.isBlocked)) return [];

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: dateStr,
      status: { in: ['REQUESTED', 'CONFIRMED', 'PATIENT_CONFIRMED', 'RESCHEDULED'] as any },
    },
    select: { time: true },
  });
  const bookedTimes = appointments.map(a => a.time);

  const dayOfWeek = DAY_NAMES[date.getDay()];
  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId, dayOfWeek, isActive: true },
    include: { chamber: true }
  });

  const sources: any[] = [
    ...schedules.map(s => ({ ...s, source: 'schedule' })),
    ...overrides.filter(o => !o.isBlocked).map(o => ({ ...o, source: 'override' })),
  ];

  const slots: SlotInfo[] = [];

  for (const src of sources) {
    const startMins = timeToMinutes(src.startTime);
    const endMins = timeToMinutes(src.endTime);
    const duration = src.slotDuration || 30;
    const maxPatients = src.maxPatients || 10;

    for (let t = startMins; t + duration <= endMins; t += duration) {
      const slotStart = minutesToTime(t);
      const slotEnd = minutesToTime(t + duration);
      const bookedCount = bookedTimes.filter(bt => bt === slotStart).length;

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        slotType: src.slotType || 'IN_PERSON',
        chamberAddress: src.chamberAddress || src.chamber?.address || '',
        chamberId: src.chamberId || undefined,
        chamberName: src.chamber?.name || undefined,
        consultationFee: src.consultationFee ? Number(src.consultationFee) : undefined,
        bookedCount,
        maxPatients,
        isAvailable: bookedCount < maxPatients,
        scheduleId: src.source === 'schedule' ? src.id : undefined,
        overrideId: src.source === 'override' ? src.id : undefined,
      });
    }
  }

  return slots;
}

export async function isSlotAvailable(doctorId: string, dateStr: string, time: string): Promise<boolean> {
  const slots = await getAvailableSlots(doctorId, dateStr);
  const target = slots.find(s => s.startTime === time);
  return !!target && target.isAvailable;
}
