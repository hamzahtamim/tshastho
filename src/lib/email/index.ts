import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Tshastho <noreply@tshastho.com>';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  pharmacyId?: string;
  userId?: string;
  templateKey?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends an email via Resend.
 * If no API key configured, logs to console only (dev mode).
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  if (!resend) {
    console.log('[EMAIL_MOCK]', {
      to: params.to,
      subject: params.subject,
    });
    return { success: true, id: 'mock-' + Date.now() };
  }

  try {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, id: result.data?.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  orderConfirmed: (data: { orderNumber: string; customerName: string; total: number; pharmacyName: string }) => ({
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Tshastho</h1>
        <h2>Order Confirmed ✅</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>#${data.orderNumber}</strong> has been confirmed.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Total:</strong> ৳ ${data.total.toFixed(2)}</p>
          <p style="margin: 8px 0 0;"><strong>Pharmacy:</strong> ${data.pharmacyName}</p>
        </div>
        <p>We'll notify you when it's ready for delivery.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Tshastho — Connected Healthcare. Trusted Care.</p>
      </div>
    `,
  }),

  orderReady: (data: { orderNumber: string; customerName: string }) => ({
    subject: `Order Ready — ${data.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Tshastho</h1>
        <h2>Order Ready for Delivery 🚚</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>#${data.orderNumber}</strong> is ready and will be delivered soon.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Tshastho — Connected Healthcare. Trusted Care.</p>
      </div>
    `,
  }),

  orderDelivered: (data: { orderNumber: string; customerName: string }) => ({
    subject: `Order Delivered — ${data.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Tshastho</h1>
        <h2>Order Delivered ✅</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>#${data.orderNumber}</strong> has been delivered. Thank you!</p>
        <p>Have feedback? Reply to this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Tshastho — Connected Healthcare. Trusted Care.</p>
      </div>
    `,
  }),

  dailySummary: (data: { pharmacyName: string; date: string; sales: number; orders: number; profit: number }) => ({
    subject: `Daily Summary — ${data.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Tshastho</h1>
        <h2>Daily Summary — ${data.pharmacyName}</h2>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 8px 0 0;"><strong>Sales:</strong> ৳ ${data.sales.toFixed(2)}</p>
          <p style="margin: 8px 0 0;"><strong>Orders:</strong> ${data.orders}</p>
          <p style="margin: 8px 0 0;"><strong>Profit:</strong> ৳ ${data.profit.toFixed(2)}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Tshastho — Connected Healthcare. Trusted Care.</p>
      </div>
    `,
  }),

  lowStockAlert: (data: { pharmacyName: string; medicineName: string; stock: number }) => ({
    subject: `⚠️ Low Stock Alert — ${data.medicineName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Tshastho</h1>
        <h2 style="color: #dc2626;">⚠️ Low Stock Alert</h2>
        <p><strong>${data.medicineName}</strong> is running low.</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Current stock:</strong> ${data.stock} units</p>
          <p style="margin: 8px 0 0;"><strong>Pharmacy:</strong> ${data.pharmacyName}</p>
        </div>
        <p>Please reorder soon to avoid stock-out.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Tshastho — Connected Healthcare. Trusted Care.</p>
      </div>
    `,
  }),
};
