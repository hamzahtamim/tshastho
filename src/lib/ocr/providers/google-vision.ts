export interface GoogleVisionResult {
  text: string;
  items: { medicineName: string; strength?: string }[];
  confidence: number;
  error?: string;
  raw?: any;
}

export async function extractWithGoogleVision(
  apiKey: string,
  imageUrl: string
): Promise<GoogleVisionResult> {
  try {
    // 1. Fetch image bytes
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return { text: '', items: [], confidence: 0, error: 'Failed to fetch image' };
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString('base64');

    // 2. Call Google Vision
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { text: '', items: [], confidence: 0, error: `Google Vision: ${res.status}`, raw: err };
    }

    const data = await res.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';

    // Parse medicine names using simple heuristics
    const items = parseMedicinesFromText(text);

    return {
      text,
      items,
      confidence: items.length > 0 ? 0.6 : 0,
      raw: data,
    };
  } catch (e) {
    return { text: '', items: [], confidence: 0, error: e.message };
  }
}

/**
 * Simple parser: extract medicine-like words from OCR text.
 * Matches lines that look like "MedicineName 500mg" or "MedicineName 1+0+1"
 */
function parseMedicinesFromText(text: string): { medicineName: string; strength?: string }[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: { medicineName: string; strength?: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Match: "Name 500mg" or "Name 5 mg" or "Name 500 mg"
    const strengthMatch = line.match(/^([A-Za-z][A-Za-z\s\-\.]{2,40})\s+(\d+\s*(?:mg|ml|gm|mcg|IU|%))$/i);
    if (strengthMatch) {
      const name = strengthMatch[1].trim();
      const strength = strengthMatch[2].replace(/\s+/g, '');
      if (name.length >= 3 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        items.push({ medicineName: name, strength });
      }
      continue;
    }

    // Match: "Name 1+0+1" (dosage pattern)
    const dosageMatch = line.match(/^([A-Za-z][A-Za-z\s\-\.]{2,40})\s+(\d+\+\d+\+\d+)/);
    if (dosageMatch) {
      const name = dosageMatch[1].trim();
      if (name.length >= 3 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        items.push({ medicineName: name });
      }
    }
  }

  return items.slice(0, 30);
}
