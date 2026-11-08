import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');

  const where: any = { patientId: user.id };
  if (statusFilter && statusFilter !== 'ALL') where.status = statusFilter as any;

  try {
    // Select ব্যবহার করে শুধু প্রয়োজনীয় ফিল্ড নেওয়া হচ্ছে (অনেক দ্রুত কাজ করবে)
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: 50, // পেজ লোড দ্রুত করতে লিমিট
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        consultationFee: true,
        symptoms: true,
        consultationNotes: true,
        patientNotes: true,
        doctor: {
          select: {
            specialty: true,
            user: { select: { name: true } }
          }
        },
        telemedicine: { select: { id: true, status: true } }
      }
    });

    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}