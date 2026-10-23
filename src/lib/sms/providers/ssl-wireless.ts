export interface SslWirelessConfig {
  apiKey: string;
  senderId: string;
  baseUrl?: string;
}

export interface SendResult {
  success: boolean;
  refId?: string;
  error?: string;
  raw?: any;
}

export async function sendSslWireless(
  config: SslWirelessConfig,
  phone: string,
  message: string
): Promise<SendResult> {
  const baseUrl = config.baseUrl || 'https://smsplus.sslwireless.com';

  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) normalized = '88' + normalized;
  else if (!normalized.startsWith('88')) normalized = '88' + normalized;

  const csmsId = `TSH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await fetch(`${baseUrl}/api/v3/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_token: config.apiKey,
        sid: config.senderId,
        msisdn: normalized,
        sms: message,
        csms_id: csmsId,
      }),
    });

    const data = await res.json();

    if (data.status === 'SUCCESS') {
      return {
        success: true,
        refId: data.smsinfo?.csms_id || csmsId,
        raw: data,
      };
    }

    return {
      success: false,
      error: data.error_message || data.status || 'Send failed',
      raw: data,
    };
  } catch (e) {
    return { success: false, error: e.message || 'Network error' };
  }
}
