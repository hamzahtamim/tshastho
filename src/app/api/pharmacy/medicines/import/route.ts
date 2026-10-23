import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/guards';
import { errorResponse, ErrorCodes } from '@/lib/errors';
import { z } from 'zod';

async function getPharmacyId(user: any) {
  if (user.role === 'PHARMACY_OWNER') {
    const p = await prisma.pharmacy.findFirst({ where: { userId: user.id } });
    return p?.id || null;
  }
  return user.parentPharmacyId;
}

const rowSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  genericName: z.string().optional(),
  category: z.string().optional(),
  strength: z.string().optional(),
  unit: z.string().default('piece'),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  stripSize: z.coerce.number().int().min(1).default(10),
  boxSize: z.coerce.number().int().min(1).default(100),
  manufacturer: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1).max(2000),
  mode: z.enum(['skip', 'update']).default('skip'),
});

export async function POST(req: Request) {
  const auth = await requireRole(['PHARMACY_OWNER', 'SUPER_ADMIN']);
  if (auth.error) return auth.error;
  const user = auth.user!;
  const pharmacyId = await getPharmacyId(user);
  if (!pharmacyId) return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Pharmacy not found', 404);

  try {
    const body = await req.json();
    const data = schema.parse(body);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      try {
        // Match by name + brand
        const existing = await prisma.medicine.findFirst({
          where: {
            pharmacyId,
            name: row.name,
            brand: row.brand || null,
          },
        });

        if (existing) {
          if (data.mode === 'skip') {
            skipped++;
            continue;
          }
          await prisma.medicine.update({
            where: { id: existing.id },
            data: {
              genericName: row.genericName || existing.genericName,
              category: row.category || existing.category,
              unit: row.unit,
              purchasePrice: row.purchasePrice,
              sellingPrice: row.sellingPrice,
              stock: row.stock,
              stripSize: row.stripSize,
              boxSize: row.boxSize,
              manufacturer: row.manufacturer || existing.manufacturer,
              isActive: row.isActive,
            },
          });
          updated++;
        } else {
          await prisma.medicine.create({
            data: {
              pharmacyId,
              name: row.name,
              brand: row.brand || null,
              genericName: row.genericName || null,
              category: row.category || null,
              unit: row.unit,
              purchasePrice: row.purchasePrice,
              sellingPrice: row.sellingPrice,
              stock: row.stock,
              stripSize: row.stripSize,
              boxSize: row.boxSize,
              manufacturer: row.manufacturer || null,
              isActive: row.isActive,
            },
          });
          created++;
        }
      } catch (err) {
        errors.push({ row: i + 1, message: err.message || 'Failed' });
      }
    }

    return NextResponse.json({
      success: true,
      summary: { created, updated, skipped, errors: errors.length },
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.issues[0].message, 400);
    }
    console.error('[BULK_IMPORT]', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed', 500);
  }
}
