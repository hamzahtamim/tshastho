import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

// 1. GET: Load the Doctor's Profile
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: user.id },
      include: { 
        user: { select: { name: true, email: true, phone: true, avatarUrl: true } } 
      }
    });
    
    if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    
    return NextResponse.json({ doctor });
  } catch (error) {
    console.error("[GET_PROFILE]", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// 2. POST: Save Profile & Avatar Updates
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const { avatarUrl, signatureUrl, ...doctorData } = data; // Separate avatar from doctor fields

    // Update User Table (Avatar & Phone)
    const userUpdateData: any = {};
    if (avatarUrl) userUpdateData.avatarUrl = avatarUrl;
    if (doctorData.bookingPhone) userUpdateData.phone = doctorData.bookingPhone;
    
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData
      });
    }

    // Update Doctor Table (Other fields)
    const updatedDoctor = await prisma.doctor.update({
      where: { userId: user.id },
      data: {
        specialty: doctorData.specialty || undefined,
        licenseNumber: doctorData.licenseNumber || undefined,
        onlineFee: doctorData.onlineFee ? Number(doctorData.onlineFee) : undefined,
        offlineFee: doctorData.offlineFee ? Number(doctorData.offlineFee) : undefined,
        videoIntroUrl: doctorData.videoIntroUrl || undefined,
        emergencyAvailable: doctorData.emergencyAvailable ?? undefined,
        services: doctorData.services || undefined,
        insurances: doctorData.insurances || undefined,
        experience: Number(doctorData.experience) || undefined,
        consultationFee: Number(doctorData.consultationFee) || undefined,
        chamberAddress: doctorData.chamberAddress || undefined,
        bio: doctorData.bio || undefined,
        signatureUrl: signatureUrl || undefined,
        gender: doctorData.gender || undefined,
        languages: doctorData.languages || undefined,
        hospitalAffiliation: doctorData.hospitalAffiliation || undefined,
        subSpecialties: doctorData.subSpecialties || undefined,
        onlineAvailable: doctorData.onlineAvailable ?? undefined,
        inPersonAvailable: doctorData.inPersonAvailable ?? undefined,
      },
      include: { user: true }
    });

    return NextResponse.json({ success: true, doctor: updatedDoctor });
  } catch (error) {
    console.error("[UPDATE_PROFILE]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
