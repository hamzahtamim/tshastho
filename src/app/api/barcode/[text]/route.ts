import { NextResponse } from 'next/server';
import { generateBarcodeBuffer, BarcodeFormat } from '@/lib/barcode';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ text: string }> }
) {
  const { text } = await params;
  const url = new URL(req.url);

  const format = (url.searchParams.get('format') as BarcodeFormat) || 'code128';
  const height = Number(url.searchParams.get('height') || 40);
  const includetext = url.searchParams.get('text') !== 'false';

  try {
    const buffer = await generateBarcodeBuffer(decodeURIComponent(text), {
      format,
      height,
      includetext,
    });

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
