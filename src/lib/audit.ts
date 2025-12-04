import { db } from './db';
import { headers } from 'next/headers';

export type AuditAction =
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'case.created'
  | 'case.updated'
  | 'case.deleted'
  | 'case.status_changed'
  | 'form.created'
  | 'form.updated'
  | 'form.submitted'
  | 'form.approved'
  | 'form.rejected'
  | 'recording.created'
  | 'recording.transcribed'
  | 'recording.analyzed'
  | 'recording.deleted'
  | 'api_key.created'
  | 'api_key.deleted'
  | 'api_key.used'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.deleted'
  | 'settings.updated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled';

export interface AuditLogParams {
  organizationId: string;
  userId: string;
  userEmail?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams) {
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || undefined;

  return db.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      userEmail: params.userEmail,
      ipAddress,
      userAgent,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      oldValue: params.oldValue,
      newValue: params.newValue,
      metadata: params.metadata || {},
    },
  });
}

/**
 * Get audit logs for an organization
 */
export async function getAuditLogs(
  organizationId: string,
  options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
  } = options;

  const where: Record<string, unknown> = {
    organizationId,
  };

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogs(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  const logs = await db.auditLog.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const csvRows = [
    ['Timestamp', 'User ID', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address'].join(','),
    ...logs.map(log => [
      log.createdAt.toISOString(),
      log.userId,
      log.userEmail || '',
      log.action,
      log.entityType,
      log.entityId || '',
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.ipAddress || '',
    ].join(',')),
  ];

  return csvRows.join('\n');
}
