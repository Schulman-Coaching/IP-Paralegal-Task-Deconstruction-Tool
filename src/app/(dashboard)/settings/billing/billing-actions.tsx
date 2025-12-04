'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Settings } from 'lucide-react';
import { Plan } from '@prisma/client';

interface BillingActionsProps {
  organizationId: string;
  targetPlan?: Plan;
  isUpgrade?: boolean;
  hasStripeCustomer: boolean;
}

export function BillingActions({
  organizationId,
  targetPlan,
  isUpgrade,
  hasStripeCustomer,
}: BillingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!targetPlan) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, plan: targetPlan }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manage billing button (no target plan)
  if (!targetPlan) {
    return (
      <button
        onClick={handleManageBilling}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Settings className="w-4 h-4" />
        )}
        Manage Billing
      </button>
    );
  }

  // Upgrade/downgrade button
  return (
    <button
      onClick={handleChangePlan}
      disabled={loading}
      className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 ${
        isUpgrade
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'border hover:bg-slate-50'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {isUpgrade ? 'Upgrade' : 'Downgrade'}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}
