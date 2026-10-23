import bwipjs from 'bwip-js';

export type BarcodeFormat = 'code128' | 'ean13' | 'ean8' | 'code39' | 'upca';

export interface BarcodeOptions {
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  includetext?: boolean;
  textxalign?: 'center' | 'left' | 'right';
  textsize?: number;
}

/**
 * Generates a barcode as PNG buffer.
 * Server-side utility.
 */
export async function generateBarcodeBuffer(
  text: string,
  opts: BarcodeOptions = {}
): Promise<Buffer> {
  const format = opts.format || 'code128';
  const options: any = {
    bcid: format,
    text: text,
    scale: 3,
    height: opts.height ? Math.round(opts.height / 3) : 10,
    includetext: opts.includetext !== false,
    textxalign: opts.textxalign || 'center',
    textsize: opts.textsize || 8,
  };

  try {
    return await bwipjs.toBuffer(options);
  } catch (e) {
    throw new Error(`Barcode generation failed: ${e.message}`);
  }
}

/**
 * Generates barcode as base64 data URL (for inline use).
 */
export async function generateBarcodeDataUrl(
  text: string,
  opts: BarcodeOptions = {}
): Promise<string> {
  const buffer = await generateBarcodeBuffer(text, opts);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Validates EAN13 checksum.
 */
export function isValidEan13(text: string): boolean {
  if (!/^\d{13}$/.test(text)) return false;
  const digits = text.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  const expected = (10 - (sum % 10)) % 10;
  return check === expected;
}

/**
 * Generates EAN13 with valid checksum from 12-digit prefix.
 */
export function generateEan13(prefix12: string): string {
  if (!/^\d{12}$/.test(prefix12)) throw new Error('Need exactly 12 digits');
  const digits = prefix12.split('').map(Number);
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return prefix12 + check;
}

/**
 * Generates a unique barcode from medicine info.
 */
export function generateMedicineBarcode(medicineId: string): string {
  const prefix = 'TSH';
  const idPart = medicineId.replace(/\D/g, '').slice(-8).padStart(8, '0');
  return `${prefix}${idPart}`;
}
