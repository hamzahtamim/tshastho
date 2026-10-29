import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { isSlotAvailable } from '@/lib/doctor/schedule';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

const schema = z.object({
  doctorId: z.string().min(1),
  date: z.string().min(8),
  time: z.string().min(4),
  slotType: z.string().optional(),
  fee: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(['WALLET', 'CASH']).default('WALLET'),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    // 1. Verify doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Doctor not found', 404);

    // 2. Check slot availability
    const available = await isSlotAvailable(data.doctorId, data.date, data.time);
    if (!available) return errorResponse(ErrorCodes.CONFLICT, 'This slot is no longer available', 409);

    // 3. Prevent duplicate booking
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        patientId: user.id,
        date: data.date,
        time: data.time,
        status: { in: ['REQUESTED', 'CONFIRMED', 'PATIENT_CONFIRMED', 'RESCHEDULED'] },
      },
    });
    if (existing) return errorResponse(ErrorCodes.CONFLICT, 'You already booked this slot', 409);

    const fee = Number(data.fee) || Number(doctor.consultationFee) || 0;
    let paymentStatus = 'UNPAID';

    // 4. Create Appointment & handle Payment in a Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Handle Wallet Payment
      if (data.paymentMethod === 'WALLET' || data.slotType === 'ONLINE') {
        const wallet = await tx.walletAccount.findUnique({ where: { userId: user.id } });
        if (!wallet || Number(wallet.balance) < fee) {
          throw new Error('Insufficient wallet balance. Please top up or choose Cash.');
        }

        // Deduct wallet
        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: fee },
            availableBalance: { decrement: fee },
            totalSpent: { increment: fee },
          },
        });

        // Create Wallet Transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'APPOINTMENT',
            direction: 'DEBIT',
            amount: fee,
            balanceBefore: Number(wallet.balance),
            balanceAfter: Number(wallet.balance) - fee,
            vertical: 'DOCTOR',
            description: `Appointment booking with Dr. ${doctor.specialty}`,
          },
        });
        paymentStatus = 'PAID';
      }

      // Create Appointment
      const appointment = await tx.appointment.create({
        data: {
          patientId: user.id,
          doctorId: data.doctorId,
          date: data.date,
          time: data.time,
          slotType: data.slotType,
          consultationFee: fee,
          paymentStatus: paymentStatus,
          status: 'REQUESTED',
          patientNotes: data.notes,
        },
      });

      // Create Doctor Earning (Status PENDING initially)
      await tx.doctorEarning.create({
        data: {
          doctorId: doctor.id,
          appointmentId: appointment.id,
          patientId: user.id,
          grossAmount: fee,
          netAmount: fee, // You can add platform fee logic here later
          status: 'PENDING' as any,
        },
      });

      // Notify doctor
      await tx.notification.create({
        data: {
          userId: doctor.userId,
          title: 'New Appointment Request',
          message: `New appointment on ${data.date} at ${data.time}`,
          type: 'info',
          link: '/doctor',
        },
      });

      return appointment;
    });

    return NextResponse.json({ success: true, appointment: result }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    if (error.message === 'Insufficient wallet balance. Please top up or choose Cash.') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.message, 400);
    }
    console.error('[BOOKING_ERROR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Booking failed', 500);
  }
}
