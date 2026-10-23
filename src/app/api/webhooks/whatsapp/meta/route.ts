import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Meta WhatsApp webhook for delivery/read status updates.
 * Configure at: https://your-domain.com/api/webhooks/whatsapp/meta
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entries = body.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        // Status updates
        for (const status of value.statuses || []) {
          const messageId = status.id;
          const newStatus = status.status; // sent, delivered, read, failed

          if (!messageId) continue;

          const log = await prisma.whatsAppLog.findFirst({
            where: { providerRefId: messageId },
          });
          if (!log) continue;

          const statusMap: Record<string, unknown> = {
            sent: 'SENT',
            delivered: 'DELIVERED',
            read: 'READ',
            failed: 'FAILED',
          };

          const update: any = { status: statusMap[newStatus] || log.status };
          if (newStatus === 'delivered') update.deliveredAt = new Date();
          if (newStatus === 'read') update.readAt = new Date();
          if (newStatus === 'failed') update.failureReason = 'Delivery failed';

          await prisma.whatsAppLog.update({
            where: { id: log.id },
            data: update,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WA_WEBHOOK]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * Webhook verification (Meta sends GET request with hub.mode)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
