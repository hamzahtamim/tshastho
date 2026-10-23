// Mushak 6.3 VAT Challan PDF renderer — Item 16
// Bangladesh NBR prescribed format.

import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';

export interface Mushak6_3Data {
  invoiceNumber: string;
  invoiceDate: Date;
  seller: { name: string; bin: string; address: string; vatRegNumber?: string };
  buyer: { name: string; bin?: string; address?: string; phone?: string };
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export async function buildMushakData(invoiceId: string): Promise<Mushak6_3Data | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any;

  const inv = await p.vatInvoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return null;

  const pharmacy = await p.pharmacy.findUnique({
    where: { id: inv.pharmacyId },
    select: { name: true, address: true, drugLicense: true },
  });

  let tc: { vatNumber?: string | null; vatRegistered?: boolean; businessName?: string | null; businessAddress?: string | null } | null = null;
  try {
    tc = await p.taxConfiguration.findUnique({
      where: { pharmacyId: inv.pharmacyId },
      select: { vatNumber: true, vatRegistered: true, businessName: true, businessAddress: true },
    });
  } catch {
    tc = null;
  }

  let items: Mushak6_3Data['items'] = [];

  if (inv.orderId) {
    const orderItems = await p.orderItem.findMany({
      where: { orderId: inv.orderId },
      select: { quantity: true, unitPrice: true, subtotal: true, medicineId: true },
    });
    const medIds: string[] = Array.from(new Set(orderItems.map((i: { medicineId: string }) => i.medicineId).filter(Boolean)));
    const meds = medIds.length > 0
      ? await p.medicine.findMany({ where: { id: { in: medIds } }, select: { id: true, name: true } })
      : [];
    const medMap = new Map<string, string>(meds.map((m: { id: string; name: string }) => [m.id, m.name]));
    items = orderItems.map((i: { medicineId: string; quantity: number; unitPrice: any; subtotal: any }) => ({
      description: medMap.get(i.medicineId) ?? 'Item',
      quantity: Number(i.quantity ?? 0),
      unitPrice: Number(i.unitPrice ?? 0),
      total: Number(i.subtotal ?? 0),
    }));
  } else if (inv.posSaleId) {
    const posItems = await p.posSaleItem.findMany({
      where: { saleId: inv.posSaleId },
      select: { medicineName: true, quantity: true, unitPrice: true, subtotal: true },
    });
    items = posItems.map((i: { medicineName: string; quantity: number; unitPrice: any; subtotal: any }) => ({
      description: i.medicineName,
      quantity: Number(i.quantity ?? 0),
      unitPrice: Number(i.unitPrice ?? 0),
      total: Number(i.subtotal ?? 0),
    }));
  }

  if (items.length === 0) {
    items = [{
      description: 'Pharmacy purchase (summary)',
      quantity: 1,
      unitPrice: Number(inv.subtotal ?? 0),
      total: Number(inv.subtotal ?? 0),
    }];
  }

  return {
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate ?? new Date(),
    seller: {
      name: tc?.businessName ?? pharmacy?.name ?? 'Pharmacy',
      bin: tc?.vatNumber ?? '',
      address: tc?.businessAddress ?? pharmacy?.address ?? '',
      vatRegNumber: tc?.vatNumber ?? undefined,
    },
    buyer: {
      name: inv.customerName ?? 'Walk-in Customer',
      bin: inv.customerVatNumber ?? undefined,
      phone: inv.customerPhone ?? undefined,
    },
    items,
    subtotal: Number(inv.subtotal ?? 0),
    discount: Number(inv.discount ?? 0),
    vatRate: Number(inv.vatRate ?? 0),
    vatAmount: Number(inv.vatAmount ?? 0),
    totalAmount: Number(inv.totalAmount ?? 0),
  };
}

export function renderMushakPDF(data: Mushak6_3Data): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 60;
      const money = (n: number) =>
        n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      doc.fontSize(9).text("Government of the People's Republic of Bangladesh", 30, 30, { width: W, align: 'center' });
      doc.fontSize(9).text('National Board of Revenue (NBR)', { width: W, align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica-Bold').text('Mushak 6.3', { width: W, align: 'center' });
      doc.fontSize(9).font('Helvetica').text('VAT Challan', { width: W, align: 'center' });
      doc.moveDown(0.5);

      const y0 = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', 30, y0, { continued: true });
      doc.font('Helvetica').text(' ' + data.invoiceNumber);
      doc.font('Helvetica-Bold').text('Date:', 330, y0, { continued: true });
      doc.font('Helvetica').text(' ' + new Date(data.invoiceDate).toISOString().slice(0, 10));
      doc.moveDown(0.5);

      const boxTop = doc.y;
      doc.rect(30, boxTop, W / 2 - 5, 90).stroke();
      doc.rect(30 + W / 2 + 5, boxTop, W / 2 - 5, 90).stroke();
      doc.font('Helvetica-Bold').fontSize(9).text('Seller (Issuer)', 38, boxTop + 5);
      doc.font('Helvetica').fontSize(8);
      doc.text(data.seller.name, 38, boxTop + 20, { width: W / 2 - 20 });
      doc.text('BIN: ' + (data.seller.bin || 'N/A'), 38, boxTop + 34);
      if (data.seller.vatRegNumber) doc.text('VAT Reg: ' + data.seller.vatRegNumber, 38, boxTop + 46);
      doc.text('Address: ' + data.seller.address, 38, boxTop + 58, { width: W / 2 - 20 });

      doc.font('Helvetica-Bold').fontSize(9).text('Buyer (Purchaser)', 38 + W / 2 + 5, boxTop + 5);
      doc.font('Helvetica').fontSize(8);
      doc.text(data.buyer.name, 38 + W / 2 + 5, boxTop + 20, { width: W / 2 - 20 });
      doc.text('BIN: ' + (data.buyer.bin || 'N/A'), 38 + W / 2 + 5, boxTop + 34);
      if (data.buyer.phone) doc.text('Phone: ' + data.buyer.phone, 38 + W / 2 + 5, boxTop + 46);
      doc.text('Address: ' + (data.buyer.address || 'N/A'), 38 + W / 2 + 5, boxTop + 58, { width: W / 2 - 20 });

      doc.y = boxTop + 100;
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const rowH = 18;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.rect(30, tableTop, W, rowH).fill('#2c3e50');
      doc.fillColor('white');
      doc.text('#', 34, tableTop + 5, { width: 30 });
      doc.text('Description', 64, tableTop + 5, { width: 240 });
      doc.text('Qty', 310, tableTop + 5, { width: 50, align: 'right' });
      doc.text('Unit Price', 365, tableTop + 5, { width: 70, align: 'right' });
      doc.text('Total', 440, tableTop + 5, { width: 70, align: 'right' });

      let y = tableTop + rowH;
      doc.fillColor('black').font('Helvetica').fontSize(8);
      data.items.forEach((it, idx) => {
        if (y + rowH > doc.page.height - 200) { doc.addPage(); y = 30; }
        doc.text(String(idx + 1), 34, y + 4, { width: 30 });
        doc.text(it.description.slice(0, 60), 64, y + 4, { width: 240 });
        doc.text(String(it.quantity), 310, y + 4, { width: 50, align: 'right' });
        doc.text(money(it.unitPrice), 365, y + 4, { width: 70, align: 'right' });
        doc.text(money(it.total), 440, y + 4, { width: 70, align: 'right' });
        y += rowH;
        doc.moveTo(30, y).lineTo(30 + W, y).strokeColor('#cccccc').stroke();
      });

      let ty = y + 12;
      const trow = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, 330, ty, { width: 130, align: 'right' });
        doc.text(value, 465, ty, { width: 100, align: 'right' });
        ty += 16;
      };
      trow('Subtotal', 'BDT ' + money(data.subtotal));
      if (data.discount > 0) trow('Discount', '- BDT ' + money(data.discount));
      trow('VAT (' + data.vatRate.toFixed(2) + '%)', 'BDT ' + money(data.vatAmount));
      doc.moveTo(330, ty - 4).lineTo(565, ty - 4).stroke();
      ty += 4;
      trow('Grand Total', 'BDT ' + money(data.totalAmount), true);

      doc.font('Helvetica').fontSize(7).fillColor('#666');
      doc.text(
        'This is a computer-generated Mushak 6.3 VAT Challan. Retain for VAT compliance.',
        30,
        doc.page.height - 60,
        { width: W, align: 'center' },
      );
      doc.text('Generated on ' + new Date().toISOString().slice(0, 19).replace('T', ' '), { width: W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
