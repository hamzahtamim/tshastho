export interface OpenAiResult {
  text: string;
  items: { medicineName: string; strength?: string }[];
  confidence: number;
  error?: string;
  raw?: any;
}

export async function extractWithOpenAi(
  apiKey: string,
  imageUrl: string
): Promise<OpenAiResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a medical prescription OCR assistant. Extract medicine names and strengths from prescription images. Return JSON only.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all medicine details from this prescription image.

Return ONLY a valid JSON array with this exact structure:
[{"medicineName":"Paracetamol","strength":"500mg"}]

Rules:
- medicineName is required
- strength is optional but preferred
- If image is unclear, return []
- No explanation, only JSON array`,
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { text: '', items: [], confidence: 0, error: `OpenAI API: ${res.status}`, raw: err };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    let items: any[] = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }

    return {
      text: content,
      items: items
        .filter((i) => i.medicineName)
        .map((i) => ({
          medicineName: String(i.medicineName).trim(),
          strength: i.strength ? String(i.strength).trim() : undefined,
        })),
      confidence: items.length > 0 ? 0.85 : 0,
      raw: data,
    };
  } catch (e) {
    return { text: '', items: [], confidence: 0, error: e.message };
  }
}
