import { PaymentGateway, PaymentInitPayload, PaymentInitResult, PaymentVerifyResult } from '../types';
import { fetchWithRetry } from '@/lib/payments/fetch-with-retry';
import { prisma } from '@/lib/prisma';

async function getGatewayConfig() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['sslcommerz_store_id', 'sslcommerz_store_pass', 'sslcommerz_sandbox'] } }
    });
    const dbConfig = settings.reduce((acc: any, s) => ({ ...acc, [s.key]: s.value }), {});
    
    const storeId = dbConfig['sslcommerz_store_id'] || process.env.SSLCOMMERZ_STORE_ID;
    const storePass = dbConfig['sslcommerz_store_pass'] || process.env.SSLCOMMERZ_STORE_PASS;
    const isSandbox = (dbConfig['sslcommerz_sandbox'] || process.env.SSLCOMMERZ_SANDBOX) === 'true';
    const baseUrl = isSandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
    
    return { storeId, storePass, baseUrl };
  } catch (error) {
    console.error('Failed to load gateway config from DB, using env fallback');
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePass = process.env.SSLCOMMERZ_STORE_PASS;
    const isSandbox = process.env.SSLCOMMERZ_SANDBOX === 'true';
    const baseUrl = isSandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
    return { storeId, storePass, baseUrl };
  }
}

export const sslcommerzGateway: PaymentGateway = {
  name: 'SSLCOMMERZ',

  async initiate(payload: PaymentInitPayload, paymentId: string): Promise<PaymentInitResult> {
    const { storeId, storePass, baseUrl } = await getGatewayConfig();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!storeId || !storePass) {
      if (process.env.NODE_ENV === 'production' && process.env.PAYMENTS_MOCK_MODE !== 'true') {
        throw new Error('FATAL: Missing SSLCommerz credentials in production environment. Mock mode is disabled.');
      }
      console.warn('[SSLCOMMERZ] Missing credentials - using mock mode');
      return {
        gatewayTxnId: `MOCK-${paymentId}`,
        redirectUrl: `${appUrl}/api/payments/mock/success?paymentId=${paymentId}`,
        raw: { mock: true },
      };
    }

    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePass,
      total_amount: String(payload.amount),
      currency: payload.currency,
      tran_id: paymentId,
      success_url: `${appUrl}/api/payments/sslcommerz/success`,
      fail_url: `${appUrl}/api/payments/sslcommerz/fail`,
      cancel_url: `${appUrl}/api/payments/sslcommerz/cancel`,
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      cus_phone: payload.customerPhone || '01700000000',
      cus_add1: payload.customerAddress || 'N/A',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: payload.productName,
      product_category: payload.productCategory || 'Health',
      product_profile: 'general',
    });

    const res = await fetchWithRetry(`${baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data: any = await res.json();

    if (!data?.GatewayPageURL) {
      throw new Error(data?.failedreason || 'SSLCommerz initiation failed');
    }

    return {
      gatewayTxnId: data.sessionkey || paymentId,
      redirectUrl: data.GatewayPageURL,
      raw: data,
    };
  },

  async verify(gatewayTxnId: string, extras?: any): Promise<PaymentVerifyResult> {
    const valId = extras?.val_id;
    if (!valId) return { success: false, gatewayTxnId, raw: {}, failureReason: 'Missing val_id' };

    const { storeId, storePass, baseUrl } = await getGatewayConfig();

    const res = await fetchWithRetry(
      `${baseUrl}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePass}&format=json`
    );

    const data: any = await res.json();

    const success = ['VALID', 'VALIDATED'].includes(data.status);
    return {
      success,
      gatewayTxnId,
      gatewayRefId: data.bank_tran_id || data.tran_id,
      amount: data.amount ? Number(data.amount) : undefined,
      raw: data,
      failureReason: success ? undefined : data.status,
    };
  },

  async refund(gatewayTxnId: string, amount: number, reason?: string): Promise<{ refundRefId?: string; raw?: unknown }> {
    const { storeId, storePass, baseUrl } = await getGatewayConfig();
    
    if (!storeId || !storePass) {
      console.warn('[SSLCOMMERZ] Missing refund credentials - using mock mode');
      return { refundRefId: `MOCK-REFUND-${Date.now()}`, raw: { mock: true, amount, reason } };
    }
    
    const url = new URL(`${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`);
    url.searchParams.set('bank_tran_id', gatewayTxnId);
    url.searchParams.set('refund_amount', String(amount));
    url.searchParams.set('refund_remarks', reason ?? 'Customer return refund');
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePass);
    url.searchParams.set('format', 'json');

    const res = await fetchWithRetry(url.toString());
    const data: any = await res.json();

    const status = String(data?.status ?? data?.APIConnect ?? '').toUpperCase();
    const ok = status === 'SUCCESS' || status === 'DONE';
    if (!ok) {
      throw new Error(data?.errorReason || data?.failedreason || 'SSLCommerz refund failed');
    }
    return {
      refundRefId: data?.refund_ref_id ?? data?.refund_ref_number ?? data?.bank_tran_id ?? gatewayTxnId,
      raw: data,
    };
  },
};
