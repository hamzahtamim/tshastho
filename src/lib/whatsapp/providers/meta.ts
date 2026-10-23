import { WhatsAppMessage, WhatsAppResult } from '../types';

const META_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Normalize phone: 01XXXXXXXXX → 880XXXXXXXXX (no +)
 * Meta expects digits only, with country code, no plus
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '88' + p;
  else if (!p.startsWith('88')) p = '88' + p;
  return p;
}

export async function sendViaMeta(
  phoneNumberId: string,
  accessToken: string,
  message: WhatsAppMessage
): Promise<WhatsAppResult> {
  const to = normalizePhone(message.to);

  let payload: any;

  if (message.templateName) {
    // Template message (required for first contact / business initiated)
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: message.templateName,
        language: { code: 'en_US' },
        components: message.templateParams && message.templateParams.length > 0
          ? [{
              type: 'body',
              parameters: message.templateParams.map((p) => ({ type: 'text', text: p })),
            }]
          : undefined,
      },
    };
  } else if (message.mediaUrl) {
    // Media message
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: message.mediaUrl, caption: message.body || '' },
    };
  } else {
    // Plain text (only works within 24h window after customer message)
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message.body || '' },
    };
  }

  try {
    const res = await fetch(`${META_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id, raw: data };
    }

    return {
      success: false,
      error: data.error?.message || 'Meta API failed',
      raw: data,
    };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}
