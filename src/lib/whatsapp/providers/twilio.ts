import { WhatsAppMessage, WhatsAppResult } from '../types';

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '88' + p;
  else if (!p.startsWith('88')) p = '88' + p;
  return '+' + p;
}

export async function sendViaTwilio(
  accountSid: string,
  authToken: string,
  from: string,
  message: WhatsAppMessage
): Promise<WhatsAppResult> {
  const to = 'whatsapp:' + normalizePhone(message.to);
  const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: message.body || '',
  });

  if (message.mediaUrl) {
    body.append('MediaUrl', message.mediaUrl);
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const data = await res.json();

    if (res.ok && data.sid) {
      return { success: true, messageId: data.sid, raw: data };
    }

    return {
      success: false,
      error: data.message || 'Twilio API failed',
      raw: data,
    };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}
