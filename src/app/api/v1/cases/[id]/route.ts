import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';

// GET /api/v1/cases/[id] - Get single case
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseData = await db.case.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        forms: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        recordings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        assignedTo: {
          select: { id: true, userId: true, role: true },
        },
        createdBy: {
          select: { id: true, userId: true, role: true },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/cases/[id] - Update case
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingCase = await db.case.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      'title', 'status', 'clientName', 'clientEmail', 'description',
      'filingDeadline', 'filingDate', 'applicationNumber', 'registrationNumber',
      'assignedToId', 'priority',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'filingDeadline' || field === 'filingDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedCase = await db.case.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'CASE_UPDATED',
      resourceType: 'case',
      resourceId: params.id,
      details: { changes: Object.keys(updateData) },
      request,
    });

    // Create activity
    await db.activity.create({
      data: {
        type: 'CASE_UPDATED',
        content: `Case updated`,
        caseId: params.id,
        userId,
      },
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/cases/[id] - Delete case
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingCase = await db.case.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Soft delete by archiving
    await db.case.update({
      where: { id: params.id },
      data: { status: 'ARCHIVED' },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'CASE_DELETED',
      resourceType: 'case',
      resourceId: params.id,
      details: { caseNumber: existingCase.caseNumber },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to get auth context
async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['cases:read', 'cases:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
