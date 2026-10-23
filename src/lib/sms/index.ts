import { prisma } from '@/lib/prisma';
import { sendSslWireless } from './providers/ssl-wireless';

export type SmsProvider = 'SSL_WIRELESS' | 'TWILIO' | 'BANGLALINK' | 'MANUAL';

export interface SendSmsParams {
  phone: string;
  message: string;
  provider?: SmsProvider;
  pharmacyId?: string;
  customerId?: string;
  recipientName?: string;
  templateKey?: string;
  createdById?: string;
}

function normalizePhone(phone: string): string {
  const p = phone.replace(/\D/g, '');
  if (p.startsWith('880')) return p;
  if (p.startsWith('0')) return '88' + p;
  return '88' + p;
}

async function sendViaProvider(provider: SmsProvider, phone: string, message: string): Promise<{ refId?: string; error?: string }> {
  const normalized = normalizePhone(phone);

  try {
    if (provider === 'SSL_WIRELESS') {
      const apiKey = process.env.SSL_WIRELESS_API_KEY;
      const senderId = process.env.SSL_WIRELESS_SENDER_ID;
      if (!apiKey || !senderId) return { error: 'SSL Wireless not configured' };

      const result = await sendSslWireless(
        { apiKey, senderId },
        phone,
        message
      );

      return result.success ? { refId: result.refId } : { error: result.error };
    }

    if (provider === 'TWILIO') {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;
      if (!sid || !token || !from) return { error: 'Twilio not configured' };

      const body = new URLSearchParams({ To: `+${normalized}`, From: from, Body: message });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await res.json();
      if (res.ok && data.sid) return { refId: data.sid };
      return { error: data.message || 'Twilio failed' };
    }

    if (provider === 'BANGLALINK') {
      return { error: 'Banglalink not implemented yet' };
    }

    // MANUAL - just log
    return { refId: `MANUAL-${Date.now()}` };
  } catch (e) {
    return { error: e.message || 'Unknown error' };
  }
}

export async function sendSms(params: SendSmsParams) {
  const provider = params.provider || 'MANUAL';

  const log = await prisma.smsLog.create({
    data: {
      pharmacyId: params.pharmacyId || null,
      customerId: params.customerId || null,
      recipientName: params.recipientName || null,
      phone: params.phone,
      message: params.message,
      templateKey: params.templateKey || null,
      provider: provider as any,
      status: 'QUEUED',
      createdById: params.createdById || null,
    },
  });

  // If MANUAL, don't actually send — just log
  if (provider === 'MANUAL') {
    return prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), providerRefId: `MANUAL-${log.id.slice(-6)}` },
    });
  }

  const result = await sendViaProvider(provider, params.phone, params.message);

  if (result.error) {
    return prisma.smsLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', failureReason: result.error },
    });
  }

  return prisma.smsLog.update({
    where: { id: log.id },
    data: { status: 'SENT', sentAt: new Date(), providerRefId: result.refId },
  });
}

/**
 * Renders a template with variables.
 * Template uses {{var}} syntax.
 */
export function renderTemplate(body: string, vars: Record<string, unknown>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined && v !== null ? String(v) : '';
  });
}

/**
 * Gets or creates a template for a pharmacy.
 */
export async function getTemplate(pharmacyId: string, key: string, language = 'bn') {
  let template = await prisma.smsTemplate.findFirst({
    where: { pharmacyId, key, language, isActive: true },
  });

  if (!template) {
    const defaults = getDefaultTemplates();
    const def = defaults.find((t) => t.key === key && t.language === language);
    if (def) {
      template = await prisma.smsTemplate.create({
        data: {
          pharmacyId,
          key: def.key,
          name: def.name,
          language: def.language,
          body: def.body,
          isSystem: true,
        },
      });
    }
  }

  return template;
}

export function getDefaultTemplates() {
  return [
    {
      key: 'ORDER_CONFIRMED',
      name: 'Order Confirmed',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, আপনার অর্ডার #{{orderNumber}} (৳{{amount}}) কনফার্ম হয়েছে। Tshastho',
    },
    {
      key: 'ORDER_READY',
      name: 'Order Ready',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, আপনার অর্ডার #{{orderNumber}} প্রস্তুত। দ্রুত ডেলিভারি হবে। Tshastho',
    },
    {
      key: 'ORDER_DELIVERED',
      name: 'Order Delivered',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, আপনার অর্ডার #{{orderNumber}} ডেলিভার হয়েছে। ধন্যবাদ! Tshastho',
    },
    {
      key: 'REFILL_REMINDER',
      name: 'Refill Reminder',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, {{medicineName}} এর রিফিলের সময় হয়েছে। {{pharmacyName}}',
    },
    {
      key: 'CREDIT_DUE',
      name: 'Credit Due',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, আপনার কাছে ৳{{amount}} বাকি আছে। অনুগ্রহ করে পরিশোধ করুন। {{pharmacyName}}',
    },
    {
      key: 'LOW_STOCK_ALERT',
      name: 'Low Stock Alert',
      language: 'bn',
      body: '{{medicineName}} এর স্টক কম ({{currentStock}})। রিফিল প্রয়োজন।',
    },
    {
      key: 'RX_VERIFIED',
      name: 'Rx Verified',
      language: 'bn',
      body: 'প্রিয় {{customerName}}, আপনার প্রেসক্রিপশন যাচাই হয়েছে। এখন ঔষধ অর্ডার করতে পারেন।',
    },
  ];
}
