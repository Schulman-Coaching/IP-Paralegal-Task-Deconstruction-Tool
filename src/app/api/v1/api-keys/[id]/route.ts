import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// DELETE /api/v1/api-keys/[id] - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify API key belongs to organization
    const apiKey = await db.apiKey.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await db.apiKey.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'API_KEY_REVOKED',
      resourceType: 'api_key',
      resourceId: params.id,
      details: { name: apiKey.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
