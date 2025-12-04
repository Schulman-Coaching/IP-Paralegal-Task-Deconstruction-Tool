import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { createCheckoutSession, PLANS } from '@/lib/stripe';
import { Plan } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, plan } = body;

    if (organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!plan || !PLANS[plan as Plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check if user is owner
    const member = await db.member.findFirst({
      where: { organizationId, userId },
    });

    if (!member || member.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can change billing' }, { status: 403 });
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createCheckoutSession(
      organization,
      plan as Plan,
      `${origin}/settings/billing?success=true`,
      `${origin}/settings/billing?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
