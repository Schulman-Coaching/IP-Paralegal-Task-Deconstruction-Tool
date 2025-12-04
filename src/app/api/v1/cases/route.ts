import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';
import { CaseType, CaseStatus } from '@prisma/client';

// GET /api/v1/cases - List cases
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status') as CaseStatus | null;
    const type = searchParams.get('type') as CaseType | null;
    const search = searchParams.get('search');

    const where: any = { organizationId: orgId };

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      db.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { forms: true, recordings: true, documents: true },
          },
        },
      }),
      db.case.count({ where }),
    ]);

    return NextResponse.json({
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing cases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/cases - Create case
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, clientName, clientEmail, description, filingDeadline } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      );
    }

    // Generate case number
    const count = await db.case.count({ where: { organizationId: orgId } });
    const caseNumber = `${type.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newCase = await db.case.create({
      data: {
        title,
        type,
        caseNumber,
        clientName,
        clientEmail,
        description,
        filingDeadline: filingDeadline ? new Date(filingDeadline) : null,
        organizationId: orgId,
        createdById: userId,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'CASE_CREATED',
      resourceType: 'case',
      resourceId: newCase.id,
      details: { title, type, caseNumber },
      request,
    });

    // Create activity
    await db.activity.create({
      data: {
        type: 'CASE_CREATED',
        content: `Case "${title}" created`,
        caseId: newCase.id,
        userId,
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to get auth context from either Clerk or API key
async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  // Check for API key first
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['cases:read', 'cases:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  // Fall back to Clerk auth
  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
