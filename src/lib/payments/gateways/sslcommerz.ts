import { PaymentGateway, PaymentInitPayload, PaymentInitResult, PaymentVerifyResult } from '../types';
import { fetchWithRetry } from '@/lib/payments/fetch-with-retry';

const SSL_BASE = process.env.SSLCOMMERZ_SANDBOX === 'true'
  ? 'https://sandbox.sslcommerz.com'
  : 'https://securepay.sslcommerz.com';

export const sslcommerzGateway: PaymentGateway = {
  name: 'SSLCOMMERZ',

  async initiate(payload: PaymentInitPayload, paymentId: string): Promise<PaymentInitResult> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePass = process.env.SSLCOMMERZ_STORE_PASS;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!storeId || !storePass) {
    if (process.env.NODE_ENV === 'production' && process.env.PAYMENTS_MOCK_MODE !== 'true') {
      throw new Error('FATAL: Missing SSLCommerz credentials in production environment. Mock mode is disabled.');
    }
      // DEV MOCK: return a fake gateway URL so we can test the flow without live keys
      console.warn('[SSLCOMMERZ] Missing credentials — using mock mode');
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

    const res = await fetchWithRetry(`${SSL_BASE}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    if (!data?.GatewayPageURL) {
      throw new Error(data?.failedreason || 'SSLCommerz initiation failed');
    }

    return {
      gatewayTxnId: data.sessionkey || paymentId,
      redirectUrl: data.GatewayPageURL,
      raw: data,
    };
  },

  async verify(gatewayTxnId: string, extra?: any): Promise<PaymentVerifyResult> {
    const valId = extra?.val_id;
    if (!valId) return { success: false, gatewayTxnId, raw: {}, failureReason: 'Missing val_id' };

    const res = await fetchWithRetry(
      `${SSL_BASE}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${process.env.SSLCOMMERZ_STORE_ID}&store_passwd=${process.env.SSLCOMMERZ_STORE_PASS}&format=json`
    );
    const data = await res.json();

    const success = ['VALID', 'VALIDATED'].includes(data?.status);
    return {
      success,
      gatewayTxnId,
      gatewayRefId: data?.bank_tran_id || data?.tran_id,
      amount: data?.amount ? Number(data.amount) : undefined,
      raw: data,
      failureReason: success ? undefined : data?.status,
    };
  },
  async refund(gatewayTxnId: string, amount: number, reason?: string): Promise<{ refundRefId?: string; raw?: unknown }> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePass = process.env.SSLCOMMERZ_STORE_PASS;
    if (!storeId || !storePass) {
      console.warn("[SSLCOMMERZ] Missing refund credentials - using mock mode");
      return { refundRefId: `MOCK-REFUND-${Date.now()}`, raw: { mock: true, amount, reason } };
    }
    const url = new URL(`${SSL_BASE}/validator/api/merchantTransIDvalidationAPI.php`);
    url.searchParams.set("bank_tran_id", gatewayTxnId);
    url.searchParams.set("refund_amount", String(amount));
    url.searchParams.set("refund_remarks", reason ?? "Customer return refund");
    url.searchParams.set("store_id", storeId);
    url.searchParams.set("store_passwd", storePass);
    url.searchParams.set("format", "json");
    const res = await fetchWithRetry(url.toString());
    const data: any = await res.json();
    const status = String(data?.status ?? data?.APIConnect ?? "").toUpperCase();
    const ok = status === "SUCCESS" || status === "DONE";
    if (!ok) {
      throw new Error(data?.errorReason || data?.failedreason || "SSLCommerz refund failed");
    }
    return {
      refundRefId: data?.refund_ref_id ?? data?.refund_ref_number ?? data?.bank_tran_id ?? gatewayTxnId,
      raw: data,
    };
  },

};
