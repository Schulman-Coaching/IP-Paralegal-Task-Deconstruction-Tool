import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';

// GET /api/v1/forms/[id] - Get form
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        recording: { select: { id: true, title: true, transcription: true, analysis: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/v1/forms/[id] - Update form
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingForm = await db.form.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, data, status } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (data !== undefined) updateData.data = data;
    if (status !== undefined) updateData.status = status;

    const form = await db.form.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'FORM_UPDATED',
      resourceType: 'form',
      resourceId: params.id,
      details: { changes: Object.keys(updateData) },
      request,
    });

    // Create activity if linked to a case
    if (existingForm.caseId) {
      await db.activity.create({
        data: {
          type: 'FORM_UPDATED',
          content: `Form "${form.title}" updated`,
          caseId: existingForm.caseId,
          userId,
        },
      });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/forms/[id] - Delete form
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await db.form.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'FORM_DELETED',
      resourceType: 'form',
      resourceId: params.id,
      details: { title: form.title },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['forms:read', 'forms:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
