import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { createBillingPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user is owner
    const member = await db.member.findFirst({
      where: { organizationId, userId },
    });

    if (!member || member.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can access billing' }, { status: 403 });
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || !organization.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createBillingPortalSession(
      organization.stripeCustomerId,
      `${origin}/settings/billing`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
