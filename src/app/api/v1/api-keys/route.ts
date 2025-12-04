import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { generateApiKey, hashApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';

// POST /api/v1/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const member = await db.member.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, scopes, expiresAt } = body;

    if (!name || !scopes || scopes.length === 0) {
      return NextResponse.json(
        { error: 'Name and scopes are required' },
        { status: 400 }
      );
    }

    // Generate a new API key
    const key = generateApiKey();
    const keyHash = hashApiKey(key);

    const apiKey = await db.apiKey.create({
      data: {
        name,
        keyHash,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        organizationId: orgId,
        createdById: userId,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'API_KEY_CREATED',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      details: { name, scopes },
      request,
    });

    // Return the key only once - it won't be retrievable again
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned on creation
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/v1/api-keys - List API keys
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const member = await db.member.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKeys = await db.apiKey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
