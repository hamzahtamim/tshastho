// Drug Recall Scanner — Item 17
// Fetch external recalls, match against pharmacy stock, create alerts.

import { prisma } from '@/lib/prisma';

export interface ScanResult {
  scanned: number;
  inserted: number;
  errors: string[];
}

export interface ExternalRecall {
  externalId?: string;
  source: 'FDA' | 'WHO' | 'DGDA' | 'MANUAL';
  sourceUrl?: string;
  drugName: string;
  genericName?: string;
  batchNumbers: string[];
  manufacturer?: string;
  reason?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recallDate?: Date;
  publishedAt?: Date;
  rawPayload?: any;
}

/**
 * Upsert external recalls into DrugRecall table (idempotent via externalId).
 * For MVP, caller passes records; real FDA/DGDA feed integration later.
 */
export async function upsertRecalls(recalls: ExternalRecall[]): Promise<ScanResult> {
  const errors: string[] = [];
  let inserted = 0;

  for (const r of recalls) {
    try {
      if (r.externalId) {
        const existing = await prisma.drugRecall.findUnique({
          where: { externalId: r.externalId },
          select: { id: true },
        });
        if (existing) continue;
      }
      await prisma.drugRecall.create({
        data: {
          externalId: r.externalId ?? null,
          source: r.source,
          sourceUrl: r.sourceUrl ?? null,
          drugName: r.drugName,
          genericName: r.genericName ?? null,
          batchNumbers: r.batchNumbers,
          manufacturer: r.manufacturer ?? null,
          reason: r.reason ?? null,
          severity: r.severity ?? 'MEDIUM',
          recallDate: r.recallDate ?? null,
          publishedAt: r.publishedAt ?? null,
          rawPayload: (r.rawPayload as object) ?? undefined,
          aiExtracted: false,
        },
      });
      inserted += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { scanned: recalls.length, inserted, errors };
}

/**
 * Match a recall against one pharmacy's stock.
 *  - BATCH match: batchNumber in recall.batchNumbers
 *  - NAME match: medicine.name contains drugName (fallback)
 * Creates RecallMatch records idempotently.
 */
export async function matchRecallToPharmacy(
  recallId: string,
  pharmacyId: string,
): Promise<{ matches: number; errors: string[] }> {
  const errors: string[] = [];
  let matched = 0;

  const recall = await prisma.drugRecall.findUnique({ where: { id: recallId } });
  if (!recall) return { matches: 0, errors: ['Recall not found'] };

  // BATCH matches
  if (recall.batchNumbers.length > 0) {
    const batches = await prisma.batch.findMany({
      where: {
        pharmacyId,
        isActive: true,
        batchNumber: { in: recall.batchNumbers },
      },
      select: { id: true, medicineId: true, quantity: true },
    });

    for (const b of batches) {
      try {
        await prisma.recallMatch.upsert({
          where: {
            recallId_pharmacyId_batchId: {
              recallId,
              pharmacyId,
              batchId: b.id,
            },
          },
          update: {},
          create: {
            recallId,
            pharmacyId,
            batchId: b.id,
            medicineId: b.medicineId,
            matchType: 'BATCH',
            quantity: Number(b.quantity ?? 0),
            status: 'OPEN',
          },
        });
        matched += 1;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  // NAME fallback (only if no batch matches)
  if (matched === 0 && recall.drugName) {
    const meds = await prisma.medicine.findMany({
      where: {
        name: { contains: recall.drugName, mode: 'insensitive' },
      },
      select: { id: true },
      take: 5,
    });
    for (const m of meds) {
      const batches = await prisma.batch.findMany({
        where: { pharmacyId, medicineId: m.id, isActive: true },
        select: { id: true, quantity: true },
        take: 3,
      });
      for (const b of batches) {
        try {
          await prisma.recallMatch.upsert({
            where: {
              recallId_pharmacyId_batchId: {
                recallId,
                pharmacyId,
                batchId: b.id,
              },
            },
            update: {},
            create: {
              recallId,
              pharmacyId,
              batchId: b.id,
              medicineId: m.id,
              matchType: 'NAME',
              quantity: Number(b.quantity ?? 0),
              status: 'OPEN',
            },
          });
          matched += 1;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  }

  return { matches: matched, errors };
}

/**
 * Scan all active pharmacies for a given recall.
 */
export async function scanAllPharmacies(
  recallId: string,
): Promise<{ pharmacyCount: number; totalMatches: number }> {
  const pharmacies = await prisma.pharmacy.findMany({
    select: { id: true },
  });
  let totalMatches = 0;
  for (const p of pharmacies) {
    const r = await matchRecallToPharmacy(recallId, p.id);
    totalMatches += r.matches;
  }
  return { pharmacyCount: pharmacies.length, totalMatches };
}

/**
 * List recalls matched to a pharmacy.
 */
export async function listPharmacyRecalls(params: {
  pharmacyId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { pharmacyId, status } = params;
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = Math.max(0, params.offset ?? 0);

  const where = {
    pharmacyId,
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.recallMatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        recall: true,
        batch: { select: { id: true, batchNumber: true, expiryDate: true, quantity: true } },
      },
    }),
    prisma.recallMatch.count({ where }),
  ]);

  return { items, total, limit, offset };
}

/**
 * Update a match's status (OPEN → ACKNOWLEDGED → RESOLVED).
 */
export async function updateMatchStatus(params: {
  matchId: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  pharmacyId: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { matchId, status, pharmacyId, notes } = params;

  const match = await prisma.recallMatch.findUnique({
    where: { id: matchId },
    select: { id: true, pharmacyId: true },
  });
  if (!match) return { ok: false, error: 'Match not found' };
  if (match.pharmacyId !== pharmacyId) return { ok: false, error: 'Access denied' };

  await prisma.recallMatch.update({
    where: { id: matchId },
    data: {
      status,
      notes: notes ?? undefined,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
    },
  });

  return { ok: true };
}
