import Stripe from 'stripe';
import { db } from './db';
import { Plan } from '@prisma/client';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Plan configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      maxMembers: 2,
      maxCases: 10,
      maxRecordingsPerMonth: 5,
      maxStorageGB: 1,
      aiAnalysis: false,
      apiAccess: false,
      customBranding: false,
      auditLogs: false,
      sso: false,
      prioritySupport: false,
    },
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: {
      maxMembers: 5,
      maxCases: 50,
      maxRecordingsPerMonth: 50,
      maxStorageGB: 10,
      aiAnalysis: true,
      apiAccess: false,
      customBranding: false,
      auditLogs: false,
      sso: false,
      prioritySupport: false,
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: {
      maxMembers: 20,
      maxCases: 500,
      maxRecordingsPerMonth: 500,
      maxStorageGB: 100,
      aiAnalysis: true,
      apiAccess: true,
      customBranding: true,
      auditLogs: true,
      sso: false,
      prioritySupport: true,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: {
      maxMembers: -1, // unlimited
      maxCases: -1,
      maxRecordingsPerMonth: -1,
      maxStorageGB: -1,
      aiAnalysis: true,
      apiAccess: true,
      customBranding: true,
      auditLogs: true,
      sso: true,
      prioritySupport: true,
    },
  },
} as const;

export type PlanFeatures = typeof PLANS[keyof typeof PLANS]['features'];

/**
 * Get plan features
 */
export function getPlanFeatures(plan: Plan): PlanFeatures {
  return PLANS[plan].features;
}

/**
 * Check if organization can perform action based on plan limits
 */
export async function checkPlanLimit(
  organizationId: string,
  limitType: 'members' | 'cases' | 'recordings' | 'storage'
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          members: true,
          cases: true,
          recordings: true,
        },
      },
    },
  });

  if (!org) {
    return { allowed: false, limit: 0, current: 0 };
  }

  const features = getPlanFeatures(org.plan);
  let limit: number;
  let current: number;

  switch (limitType) {
    case 'members':
      limit = features.maxMembers;
      current = org._count.members;
      break;
    case 'cases':
      limit = features.maxCases;
      current = org._count.cases;
      break;
    case 'recordings':
      // For recordings, we need to count this month's recordings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      current = await db.recording.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
      });
      limit = features.maxRecordingsPerMonth;
      break;
    case 'storage':
      const totalSize = await db.recording.aggregate({
        where: { organizationId },
        _sum: { fileSize: true },
      });
      current = Math.ceil((totalSize._sum.fileSize || 0) / (1024 * 1024 * 1024)); // Convert to GB
      limit = features.maxStorageGB;
      break;
  }

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;

  return { allowed, limit, current };
}

/**
 * Create Stripe customer for organization
 */
export async function createStripeCustomer(
  organizationId: string,
  email: string,
  name: string
) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });

  await db.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

/**
 * Create checkout session for subscription
 */
export async function createCheckoutSession(
  organizationId: string,
  plan: Exclude<Plan, 'FREE'>,
  returnUrl: string
) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const priceId = PLANS[plan].priceId;
  if (!priceId) {
    throw new Error('Invalid plan');
  }

  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId || undefined,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: {
      organizationId,
      plan,
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
      },
    },
  });

  return session;
}

/**
 * Create billing portal session
 */
export async function createBillingPortalSession(
  organizationId: string,
  returnUrl: string
) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org?.stripeCustomerId) {
    throw new Error('No billing account found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Handle subscription webhook events
 */
export async function handleSubscriptionEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { organizationId, plan } = session.metadata || {};

      if (organizationId && plan) {
        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: plan as Plan,
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const { organizationId, plan } = subscription.metadata || {};

      if (organizationId) {
        await db.organization.update({
          where: { id: organizationId },
          data: {
            plan: (plan as Plan) || undefined,
            planExpiresAt: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000)
              : null,
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const { organizationId } = subscription.metadata || {};

      if (organizationId) {
        await db.organization.update({
          where: { id: organizationId },
          data: {
            plan: Plan.FREE,
            stripeSubscriptionId: null,
            planExpiresAt: null,
          },
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle failed payment - send notification, etc.
      console.error('Payment failed for invoice:', invoice.id);
      break;
    }
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org?.stripeSubscriptionId) {
    return {
      plan: org?.plan || Plan.FREE,
      status: 'none',
      features: getPlanFeatures(org?.plan || Plan.FREE),
    };
  }

  const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);

  return {
    plan: org.plan,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    features: getPlanFeatures(org.plan),
  };
}
