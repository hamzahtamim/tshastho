import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'PHARMACY_STAFF', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    let pharmacy = null;
    
    // চেক করা হচ্ছে ইউজারের কোনো parentPharmacyId আছে কি না (স্টাফদের জন্য)
    if (user.parentPharmacyId) {
      pharmacy = await prisma.pharmacy.findUnique({
        where: { id: user.parentPharmacyId },
        include: { user: true },
      });
    }
    
    // যদি না থাকে, তবে userId দিয়ে খোঁজা হচ্ছে (ওনার্সদের জন্য)
    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.findUnique({
        where: { userId: user.id },
        include: { user: true },
      });
    }

    return NextResponse.json({ pharmacy }, { status: 200 });
  } catch (error) {
    console.error("PHARMACY_PROFILE_ERROR:", error);
    return NextResponse.json({ message: "Error", error: String(error) }, { status: 500 });
  }
}
