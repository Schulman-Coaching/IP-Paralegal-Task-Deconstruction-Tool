import { requireOrg, getCurrentOrganization, hasRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PLANS, getPlanFeatures, createCheckoutSession, createBillingPortalSession } from '@/lib/stripe';
import {
  CreditCard,
  Check,
  ArrowRight,
  Zap,
  Users,
  FolderKanban,
  Mic,
  Shield,
  Webhook,
} from 'lucide-react';
import { Plan } from '@prisma/client';
import { BillingActions } from './billing-actions';

export default async function BillingPage() {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  // Check owner access for billing
  if (!hasRole(authUser.role, 'OWNER')) {
    redirect('/dashboard');
  }

  const currentPlan = organization.plan;
  const features = getPlanFeatures(currentPlan);

  const planFeatures: Record<Plan, string[]> = {
    FREE: [
      'Up to 2 team members',
      '10 cases',
      '5 recordings/month',
      'Basic forms',
      'Community support',
    ],
    STARTER: [
      'Up to 5 team members',
      '50 cases',
      '25 recordings/month',
      'All form types',
      'AI analysis (GPT)',
      'Email support',
    ],
    PROFESSIONAL: [
      'Up to 15 team members',
      'Unlimited cases',
      '100 recordings/month',
      'All form types',
      'AI analysis (GPT + Claude)',
      'API access',
      'Webhooks',
      'Priority support',
    ],
    ENTERPRISE: [
      'Unlimited team members',
      'Unlimited cases',
      'Unlimited recordings',
      'All form types',
      'AI analysis (GPT + Claude)',
      'Full API access',
      'Webhooks',
      'Audit logging',
      'SSO (coming soon)',
      'Dedicated support',
      'Custom integrations',
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold">Current Plan</h2>
            <p className="text-muted-foreground text-sm">
              You are currently on the{' '}
              <span className="font-medium text-primary">
                {PLANS[currentPlan].name}
              </span>{' '}
              plan
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              ${PLANS[currentPlan].price}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <UsageStat
            icon={<Users className="w-5 h-5" />}
            label="Team Members"
            used={organization._count.members}
            limit={features.maxMembers}
          />
          <UsageStat
            icon={<FolderKanban className="w-5 h-5" />}
            label="Cases"
            used={organization._count.cases}
            limit={features.maxCases}
          />
          <UsageStat
            icon={<Mic className="w-5 h-5" />}
            label="Recordings/Month"
            used={0} // Would need to calculate from actual usage
            limit={features.maxRecordingsPerMonth}
          />
        </div>

        {organization.stripeCustomerId && (
          <BillingActions
            organizationId={organization.id}
            hasStripeCustomer={!!organization.stripeCustomerId}
          />
        )}
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([planKey, plan]) => {
            const isCurrent = planKey === currentPlan;
            const isPopular = planKey === 'PROFESSIONAL';

            return (
              <div
                key={planKey}
                className={`relative bg-white rounded-xl border p-6 ${
                  isPopular ? 'border-primary ring-2 ring-primary/20' : ''
                } ${isCurrent ? 'bg-slate-50' : ''}`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="mb-4">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-3xl font-bold mt-2">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {planFeatures[planKey].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium"
                  >
                    Current Plan
                  </button>
                ) : (
                  <BillingActions
                    organizationId={organization.id}
                    targetPlan={planKey}
                    isUpgrade={PLANS[planKey].price > PLANS[currentPlan].price}
                    hasStripeCustomer={!!organization.stripeCustomerId}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Features Comparison */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Feature Highlights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="AI-Powered Analysis"
            description="Analyze recordings with GPT-4 and Claude for automatic entity extraction"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Enterprise Security"
            description="Audit logging, role-based access, and secure multi-tenant architecture"
          />
          <FeatureCard
            icon={<Webhook className="w-6 h-6" />}
            title="API & Integrations"
            description="RESTful API with OpenAPI docs, webhooks, and custom integrations"
          />
          <FeatureCard
            icon={<CreditCard className="w-6 h-6" />}
            title="Flexible Billing"
            description="Monthly billing, easy upgrades, and transparent pricing"
          />
        </div>
      </div>
    </div>
  );
}

function UsageStat({
  icon,
  label,
  used,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = limit === -1 ? 0 : (used / limit) * 100;
  const isUnlimited = limit === -1;

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold">
        {used}
        <span className="text-sm font-normal text-muted-foreground">
          {' '}
          / {isUnlimited ? '∞' : limit}
        </span>
      </p>
      {!isUnlimited && (
        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full ${
              percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
