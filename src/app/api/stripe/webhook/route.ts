import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import Stripe from 'stripe';
import { Plan } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plans
const priceIdToPlan: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_PRICE_ID!]: 'STARTER',
  [process.env.STRIPE_PROFESSIONAL_PRICE_ID!]: 'PROFESSIONAL',
  [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: 'ENTERPRISE',
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;

        if (organizationId) {
          // Get the subscription to find the plan
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            const priceId = subscription.items.data[0]?.price.id;
            const plan = priceIdToPlan[priceId] || 'FREE';

            await db.organization.update({
              where: { id: organizationId },
              data: {
                plan,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceIdToPlan[priceId] || 'FREE';

        // Find organization by subscription ID
        const organization = await db.organization.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (organization) {
          await db.organization.update({
            where: { id: organization.id },
            data: { plan },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find organization by subscription ID
        const organization = await db.organization.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (organization) {
          await db.organization.update({
            where: { id: organization.id },
            data: {
              plan: 'FREE',
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Find organization by customer ID
        const organization = await db.organization.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });

        if (organization) {
          // You might want to send an email notification here
          console.log(`Payment failed for organization: ${organization.id}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
