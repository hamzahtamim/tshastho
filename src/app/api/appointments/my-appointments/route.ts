import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
        const user = await prisma.user.findFirst({ where: { email: auth.user.email }});
    
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const appointments = await prisma.appointment.findMany({
      where: { patientId: user.id },
      include: {
        doctor: {
          include: { user: true }
        },
        telemedicine: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ appointments }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching appointments", error: String(error) }, { status: 500 });
  }
}
