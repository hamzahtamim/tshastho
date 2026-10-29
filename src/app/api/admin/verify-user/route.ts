import { NextResponse } from "next/server";
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const auth = await requireRole(['SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const { userId, action, reason } = await req.json();

    // 1. Update User Status
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: action,
        rejectReason: action === "REJECTED" ? reason : null,
        isVerified: action === "APPROVED",
      },
    });

    // 2. If the user is a DOCTOR, update their profile verification status
    if (user.role === 'DOCTOR') {
      await prisma.doctor.updateMany({
        where: { userId: userId },
        data: { 
          verificationStatus: action === "APPROVED" ? "VERIFIED" : "REJECTED" 
        },
      });
    }

    // 3. Create Notification
    await prisma.notification.create({
      data: {
        userId,
        title: action === "APPROVED" ? "🎉 Account Approved!" : "❌ Application Rejected",
        message: action === "APPROVED"
          ? "Your account has been verified. You can now login to Tshastho."
          : `Your application was rejected. Reason: ${reason || "Not specified"}`,
        type: action === "APPROVED" ? "confirmed" : "rejected",
        link: "/login",
      },
    });

    return NextResponse.json({ message: "User and Profile updated successfully", user }, { status: 200 });
  } catch (error) {
    console.error("[VERIFY_USER_ERROR]", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
