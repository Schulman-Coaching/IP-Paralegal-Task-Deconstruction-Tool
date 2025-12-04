import { db } from './db';
import crypto from 'crypto';

export type WebhookEvent =
  | 'case.created'
  | 'case.updated'
  | 'case.deleted'
  | 'case.status_changed'
  | 'form.created'
  | 'form.submitted'
  | 'form.approved'
  | 'recording.transcribed'
  | 'recording.analyzed'
  | 'member.added'
  | 'member.removed';

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'case.created',
  'case.updated',
  'case.deleted',
  'case.status_changed',
  'form.created',
  'form.submitted',
  'form.approved',
  'recording.transcribed',
  'recording.analyzed',
  'member.added',
  'member.removed',
];

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  organizationId: string;
}

/**
 * Generate webhook signature
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  organizationId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  // Get all active webhooks for this organization that subscribe to this event
  const webhooks = await db.webhook.findMany({
    where: {
      organizationId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    organizationId,
  };

  const payloadString = JSON.stringify(payload);

  // Send webhooks in parallel
  const deliveryPromises = webhooks.map(async (webhook) => {
    const startTime = Date.now();
    let success = false;
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      const signature = generateSignature(payloadString, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);
      success = response.ok;

      if (!success) {
        error = `HTTP ${statusCode}: ${responseBody?.substring(0, 500)}`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const duration = Date.now() - startTime;

    // Record delivery
    await db.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        statusCode,
        response: responseBody?.substring(0, 10000),
        duration,
        success,
        error,
      },
    });

    // Update webhook stats
    await db.webhook.update({
      where: { id: webhook.id },
      data: {
        lastDeliveryAt: new Date(),
        failureCount: success ? 0 : { increment: 1 },
      },
    });

    // Disable webhook after too many failures
    if (!success) {
      const webhook_updated = await db.webhook.findUnique({
        where: { id: webhook.id },
      });
      if (webhook_updated && webhook_updated.failureCount >= 10) {
        await db.webhook.update({
          where: { id: webhook.id },
          data: { isActive: false },
        });
      }
    }

    return { webhookId: webhook.id, success, error };
  });

  return Promise.all(deliveryPromises);
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  organizationId: string,
  url: string,
  events: WebhookEvent[]
) {
  const secret = crypto.randomBytes(32).toString('hex');

  return db.webhook.create({
    data: {
      organizationId,
      url,
      events,
      secret,
    },
  });
}

/**
 * Test webhook delivery
 */
export async function testWebhook(webhookId: string) {
  const webhook = await db.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload: WebhookPayload = {
    event: 'case.created',
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test webhook delivery',
    },
    organizationId: webhook.organizationId,
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = generateSignature(payloadString, webhook.secret);

  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test',
        'X-Webhook-Timestamp': testPayload.timestamp,
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000),
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    return {
      success: response.ok,
      statusCode: response.status,
      duration,
      response: responseBody.substring(0, 1000),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}
