import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';

export async function POST(req: Request) {
  const auth = await requireRole(['DOCTOR', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const { appointmentId, status, newDate, newTime, reason } = body;

    if (!appointmentId || !status) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const updateData: any = { status };

    // If Rescheduling, update date and time
    // If marking as completed, make the earning available for payout
    if (status === "COMPLETED") {
      await prisma.doctorEarning.updateMany({
        where: { appointmentId },
        data: { status: 'AVAILABLE' },
      });
    }

    if (status === "RESCHEDULED" && newDate && newTime) {
      updateData.date = newDate;
      updateData.time = newTime;
      updateData.rescheduleReason = reason || "Rescheduled by doctor";
      updateData.previousDate = (await prisma.appointment.findUnique({ where: { id: appointmentId } }))?.date;
      updateData.previousTime = (await prisma.appointment.findUnique({ where: { id: appointmentId } }))?.time;
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        doctor: { include: { user: true } },
        patient: true,
      },
    });

    // Notification logic
    let title = "Appointment Update";
    let message = `Your appointment status has been updated to ${status}`;

    if (status === "CONFIRMED") {
      title = "✅ Appointment Confirmed!";
      message = `Dr. ${appointment.doctor.user.name} confirmed your appointment on ${appointment.date} at ${appointment.time}`;
    } else if (status === "REJECTED") {
      title = "❌ Appointment Rejected";
      message = `Dr. ${appointment.doctor.user.name} could not confirm your appointment. Reason: ${reason || 'Not specified'}`;
    } else if (status === "RESCHEDULED") {
      title = "🔄 Appointment Rescheduled";
      message = `Dr. ${appointment.doctor.user.name} rescheduled your appointment to ${newDate} at ${newTime}.`;
    }

    await prisma.notification.create({
      data: {
        userId: appointment.patientId,
        title,
        message,
        type: status.toLowerCase(),
        link: "/dashboard/appointments",
      },
    });

    return NextResponse.json({ message: "Updated successfully", appointment }, { status: 200 });
  } catch (error) {
    console.error("[UPDATE_APPT_ERROR]", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
