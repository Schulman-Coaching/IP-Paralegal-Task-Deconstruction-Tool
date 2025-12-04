import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';

// GET /api/v1/recordings - List recordings
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const caseId = searchParams.get('caseId');
    const status = searchParams.get('status');

    const where: any = { organizationId: orgId };
    if (caseId) where.caseId = caseId;
    if (status) where.status = status;

    const [recordings, total] = await Promise.all([
      db.recording.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          case: { select: { id: true, caseNumber: true, title: true } },
        },
      }),
      db.recording.count({ where }),
    ]);

    return NextResponse.json({
      data: recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing recordings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/recordings - Create recording metadata
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, caseId, duration, fileSize, mimeType } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Verify case belongs to organization if provided
    if (caseId) {
      const caseExists = await db.case.findFirst({
        where: { id: caseId, organizationId: orgId },
      });
      if (!caseExists) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    const recording = await db.recording.create({
      data: {
        title,
        duration: duration || 0,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'audio/webm',
        status: 'PENDING',
        organizationId: orgId,
        caseId,
        createdById: userId,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'RECORDING_CREATED',
      resourceType: 'recording',
      resourceId: recording.id,
      details: { title },
      request,
    });

    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error('Error creating recording:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['recordings:read', 'recordings:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
