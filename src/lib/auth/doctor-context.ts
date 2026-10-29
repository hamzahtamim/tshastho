import { prisma } from '@/lib/prisma';

export async function getDoctorContext(user: any) {
  if (!user) return null;
  
  if (user.role === 'DOCTOR') {
    return prisma.doctor.findUnique({ 
      where: { userId: user.id },
      include: { user: true }
    });
  }
  
  if (user.role === 'DOCTOR_STAFF') {
    const staff = await prisma.doctorStaff.findUnique({
      where: { userId: user.id },
      include: { doctor: { include: { user: true } } }
    });
    return staff?.doctor || null;
  }
  
  return null;
}
