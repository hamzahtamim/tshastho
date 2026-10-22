import { prisma } from '@/lib/prisma';

export function generatePaymentNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `TSH-PAY-${y}${m}${d}-${rand}`;
}

export function generateRefundNumber(): string {
  const date = new Date();
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `TSH-RF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${rand}`;
}

export function generatePayoutNumber(): string {
  const date = new Date();
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `TSH-PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${rand}`;
}

export function generateSettlementNumber(): string {
  const date = new Date();
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `TSH-ST-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${rand}`;
}

// Double-entry ledger: both sides of a transaction
export async function recordLedgerEntry(params: {
  paymentId?: string;
  debitAccount: any;
  creditAccount: any;
  amount: number;
  description?: string;
  referenceId?: string;
}, tx?: any) {
  const db = tx || prisma;
  return db.ledgerEntry.create({
    data: {
      paymentId: params.paymentId,
      debitAccount: params.debitAccount,
      creditAccount: params.creditAccount,
      amount: params.amount,
      description: params.description,
      referenceId: params.referenceId,
    },
  });
}
