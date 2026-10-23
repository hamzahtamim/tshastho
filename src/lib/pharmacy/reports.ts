// Reports service — Items 29-34
// All report aggregation + CSV export utilities.

import { prisma } from '@/lib/prisma';

export type ReportType =
  | 'doctor-wise'
  | 'area-wise'
  | 'peak-hours'
  | 'pnl'
  | 'customer-aging'
  | 'supplier-aging';

export interface DateRange {
  from: Date;
  to: Date;
}

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayEnd(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function parseRange(fromRaw?: string, toRaw?: string): DateRange {
  const now = new Date();
  const to = toRaw ? dayEnd(new Date(toRaw)) : dayEnd(now);
  const from = fromRaw ? dayStart(new Date(fromRaw)) : dayStart(new Date(now.getTime() - 29 * 86_400_000));
  return { from, to };
}

// ============================================================
// Item 29 — Doctor-wise sales
// ============================================================
export async function doctorWiseReport(pharmacyId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      pharmacyId,
      createdAt: { gte: range.from, lte: range.to },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: {
      id: true,
      referralDoctorId: true,
      referralDoctorName: true,
      totalAmount: true,
      finalAmount: true,
      discountAmount: true,
    },
  });

  const map = new Map<string, { doctorId: string | null; doctorName: string; orders: number; gross: number; discount: number; net: number }>();
  for (const o of orders) {
    const key = o.referralDoctorId ?? o.referralDoctorName ?? '__none__';
    const name = o.referralDoctorName ?? 'Walk-in (no referral)';
    const row = map.get(key) ?? { doctorId: o.referralDoctorId, doctorName: name, orders: 0, gross: 0, discount: 0, net: 0 };
    row.orders += 1;
    row.gross += Number(o.totalAmount ?? 0);
    row.discount += Number(o.discountAmount ?? 0);
    row.net += Number(o.finalAmount ?? 0);
    map.set(key, row);
  }

  const items = Array.from(map.values()).sort((a, b) => b.net - a.net);
  const totals = items.reduce(
    (s, r) => ({ orders: s.orders + r.orders, gross: s.gross + r.gross, discount: s.discount + r.discount, net: s.net + r.net }),
    { orders: 0, gross: 0, discount: 0, net: 0 },
  );
  return { items, totals, range };
}

// ============================================================
// Item 30 — Area/Zone sales
// ============================================================
export async function areaWiseReport(pharmacyId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      pharmacyId,
      createdAt: { gte: range.from, lte: range.to },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: { deliveryArea: true, deliveryZone: true, finalAmount: true },
  });

  const map = new Map<string, { area: string; zone: string; orders: number; net: number }>();
  for (const o of orders) {
    const area = o.deliveryArea ?? 'Unknown';
    const zone = o.deliveryZone ?? '-';
    const key = `${area}|${zone}`;
    const row = map.get(key) ?? { area, zone, orders: 0, net: 0 };
    row.orders += 1;
    row.net += Number(o.finalAmount ?? 0);
    map.set(key, row);
  }
  const items = Array.from(map.values()).sort((a, b) => b.net - a.net);
  const totals = items.reduce((s, r) => ({ orders: s.orders + r.orders, net: s.net + r.net }), { orders: 0, net: 0 });
  return { items, totals, range };
}

// ============================================================
// Item 31 — Peak hours
// ============================================================
export async function peakHoursReport(pharmacyId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      pharmacyId,
      createdAt: { gte: range.from, lte: range.to },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: { createdAt: true, finalAmount: true },
  });

  // 7 days x 24 hours heatmap
  const buckets: { dow: number; hour: number; orders: number; net: number }[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) buckets.push({ dow: d, hour: h, orders: 0, net: 0 });

  for (const o of orders) {
    const c = new Date(o.createdAt);
    const idx = c.getDay() * 24 + c.getHours();
    buckets[idx].orders += 1;
    buckets[idx].net += Number(o.finalAmount ?? 0);
  }

  const hourly = Array.from({ length: 24 }, (_, h) => {
    const slot = buckets.filter((b) => b.hour === h);
    return {
      hour: h,
      orders: slot.reduce((s, b) => s + b.orders, 0),
      net: slot.reduce((s, b) => s + b.net, 0),
    };
  });

  const topHours = [...hourly].sort((a, b) => b.orders - a.orders).slice(0, 5);
  return { heatmap: buckets, hourly, topHours, totalOrders: orders.length, range };
}

// ============================================================
// Item 32 — Profit & Loss
// ============================================================
export async function pnlReport(pharmacyId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      pharmacyId,
      createdAt: { gte: range.from, lte: range.to },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: {
      id: true,
      finalAmount: true,
      discountAmount: true,
      items: { select: { quantity: true, unitPrice: true, purchasePrice: true } },
    },
  });

  let revenue = 0;
  let cogs = 0;
  let discount = 0;
  for (const o of orders) {
    revenue += Number(o.finalAmount ?? 0);
    discount += Number(o.discountAmount ?? 0);
    for (const it of o.items) {
      const qty = Number(it.quantity ?? 0);
      cogs += qty * Number(it.purchasePrice ?? 0);
    }
  }

  // Expenses (if model exists)
  let expenses = 0;
  let expenseBreakdown: { category: string; amount: number }[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).pharmacyExpense?.groupBy?.({
      by: ['category'],
      where: { pharmacyId, createdAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }) ?? [];
    expenseBreakdown = (rows as Array<{ category: string; _sum: { amount: any } }>).map((r) => ({
      category: r.category,
      amount: Number(r._sum.amount ?? 0),
    }));
    expenses = expenseBreakdown.reduce((s, r) => s + r.amount, 0);
  } catch {
    expenses = 0;
  }

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    discount,
    grossProfit,
    expenses,
    netProfit,
    margin,
    expenseBreakdown,
    orderCount: orders.length,
    range,
  };
}

// ============================================================
// Item 33 — Customer aging
// ============================================================
export async function customerAgingReport(pharmacyId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      pharmacyId,
      createdAt: { lte: range.to },
      paymentStatus: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
    },
    select: {
      id: true,
      orderNumber: true,
      patientId: true,
      patient: { select: { id: true, name: true, phone: true } },
      dueAmount: true,
      createdAt: true,
    },
  });

  const now = Date.now();
  const map = new Map<string, { patientId: string; name: string; phone: string | null; b0_30: number; b31_60: number; b61_90: number; b90plus: number; total: number }>();
  for (const o of orders) {
    const key = o.patientId ?? 'unknown';
    const row = map.get(key) ?? {
      patientId: key,
      name: o.patient?.name ?? 'Unknown',
      phone: o.patient?.phone ?? null,
      b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0,
    };
    const days = Math.floor((now - new Date(o.createdAt).getTime()) / 86_400_000);
    const amt = Number(o.dueAmount ?? 0);
    if (days <= 30) row.b0_30 += amt;
    else if (days <= 60) row.b31_60 += amt;
    else if (days <= 90) row.b61_90 += amt;
    else row.b90plus += amt;
    row.total += amt;
    map.set(key, row);
  }

  const items = Array.from(map.values()).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const totals = items.reduce(
    (s, r) => ({
      b0_30: s.b0_30 + r.b0_30, b31_60: s.b31_60 + r.b31_60,
      b61_90: s.b61_90 + r.b61_90, b90plus: s.b90plus + r.b90plus, total: s.total + r.total,
    }),
    { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 },
  );
  return { items, totals, range };
}

// ============================================================
// Item 34 — Supplier aging
// ============================================================
export async function supplierAgingReport(pharmacyId: string, range: DateRange) {
  let rows: Array<{ supplier: string; due: number; createdAt: Date }> = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purchaseOrders = await (prisma as any).purchaseOrder?.findMany?.({
      where: {
        pharmacyId,
        createdAt: { lte: range.to },
        paymentStatus: { in: ['PENDING', 'PARTIAL', 'UNPAID'] },
      },
      select: {
        id: true,
        dueAmount: true,
        createdAt: true,
        supplier: { select: { id: true, name: true } },
      },
    }) ?? [];
    rows = (purchaseOrders as Array<{ dueAmount: any; createdAt: Date; supplier: { name: string } | null }>).map((p) => ({
      supplier: p.supplier?.name ?? 'Unknown',
      due: Number(p.dueAmount ?? 0),
      createdAt: p.createdAt,
    }));
  } catch {
    rows = [];
  }

  const now = Date.now();
  const map = new Map<string, { supplier: string; b0_30: number; b31_60: number; b61_90: number; b90plus: number; total: number }>();
  for (const r of rows) {
    const row = map.get(r.supplier) ?? { supplier: r.supplier, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 };
    const days = Math.floor((now - new Date(r.createdAt).getTime()) / 86_400_000);
    if (days <= 30) row.b0_30 += r.due;
    else if (days <= 60) row.b31_60 += r.due;
    else if (days <= 90) row.b61_90 += r.due;
    else row.b90plus += r.due;
    row.total += r.due;
    map.set(r.supplier, row);
  }

  const items = Array.from(map.values()).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const totals = items.reduce(
    (s, r) => ({
      b0_30: s.b0_30 + r.b0_30, b31_60: s.b31_60 + r.b31_60,
      b61_90: s.b61_90 + r.b61_90, b90plus: s.b90plus + r.b90plus, total: s.total + r.total,
    }),
    { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 },
  );
  return { items, totals, range };
}

// ============================================================
// CSV export
// ============================================================
export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','));
  return lines.join('\n');
}

// ============================================================
// Dispatcher
// ============================================================
export async function runReport(type: ReportType, pharmacyId: string, range: DateRange) {
  switch (type) {
    case 'doctor-wise':    return doctorWiseReport(pharmacyId, range);
    case 'area-wise':      return areaWiseReport(pharmacyId, range);
    case 'peak-hours':     return peakHoursReport(pharmacyId, range);
    case 'pnl':            return pnlReport(pharmacyId, range);
    case 'customer-aging': return customerAgingReport(pharmacyId, range);
    case 'supplier-aging': return supplierAgingReport(pharmacyId, range);
  }
}
