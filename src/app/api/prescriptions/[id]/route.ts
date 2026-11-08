import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const { id } = await params;

  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: {
              select: {
                licenseNumber: true,
                signatureUrl: true,
                chamberAddress: true,
                bookingPhone: true,
                specialty: true,
                qualifications: true
              }
            }
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            patientProfile: true
          }
        }
      }
    });

    if (!prescription) {
      return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Prescription not found', 404);
    }

    const isDoctor = user.role === 'DOCTOR' && prescription.doctorId === user.id;
    const isPatient = prescription.patientId === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN';

    if (!isDoctor && !isPatient && !isAdmin) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'You do not have permission to view this prescription', 403);
    }

    // Flatten doctorProfile into doctor object for the frontend UI (using mutation to avoid TS errors)
    if (prescription.doctor && (prescription.doctor as any).doctorProfile) {
      const doc = prescription.doctor as any;
      const profile = doc.doctorProfile;
      
      doc.licenseNumber = profile.licenseNumber;
      doc.signatureUrl = profile.signatureUrl;
      doc.chamberAddress = profile.chamberAddress;
      doc.bookingPhone = profile.bookingPhone;
      doc.specialty = profile.specialty;
      doc.qualifications = profile.qualifications;
      
      delete doc.doctorProfile;
    }

    return NextResponse.json({ success: true, prescription });
  } catch (error) {
    console.error('[PRESCRIPTION_GET_ERROR]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch prescription', 500);
  }
}
