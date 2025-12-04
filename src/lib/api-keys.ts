import { db } from './db';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAuditLog } from './audit';

const API_KEY_PREFIX = 'ip_';
const KEY_LENGTH = 32;

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(KEY_LENGTH);
  const key = API_KEY_PREFIX + randomBytes.toString('base64url');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

/**
 * Create a new API key for an organization
 */
export async function createApiKey(
  organizationId: string,
  name: string,
  scopes: string[],
  createdBy: string,
  expiresAt?: Date
) {
  const { key, hash, prefix } = generateApiKey();

  const apiKey = await db.apiKey.create({
    data: {
      organizationId,
      name,
      key: hash,
      keyPrefix: prefix,
      scopes,
      expiresAt,
      createdBy,
    },
  });

  await createAuditLog({
    organizationId,
    userId: createdBy,
    action: 'api_key.created',
    entityType: 'api_key',
    entityId: apiKey.id,
    description: `API key "${name}" created`,
    newValue: { name, scopes, expiresAt },
  });

  // Return the full key only once - it cannot be retrieved later
  return {
    ...apiKey,
    key, // The unhashed key (only returned at creation)
  };
}

/**
 * Validate an API key and return the associated organization
 */
export async function validateApiKey(key: string) {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex');

  const apiKey = await db.apiKey.findUnique({
    where: { key: hash },
    include: {
      organization: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  // Check if key is active
  if (!apiKey.isActive) {
    return null;
  }

  // Check if key has expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update usage stats
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    apiKey,
    organization: apiKey.organization,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
  // Check for exact match or wildcard
  return (
    apiKey.scopes.includes('*') ||
    apiKey.scopes.includes(requiredScope) ||
    apiKey.scopes.some((scope) => {
      // Support wildcard patterns like 'cases.*'
      if (scope.endsWith('.*')) {
        const prefix = scope.slice(0, -2);
        return requiredScope.startsWith(prefix);
      }
      return false;
    })
  );
}

/**
 * Rate limit check for API key
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window

  // In production, use Redis for rate limiting
  // This is a simplified database-based implementation
  const recentUsage = await db.auditLog.count({
    where: {
      action: 'api_key.used',
      entityId: apiKeyId,
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, rateLimit - recentUsage);
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000);

  return {
    allowed: remaining > 0,
    remaining,
    resetAt,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  apiKeyId: string,
  organizationId: string,
  revokedBy: string
) {
  const apiKey = await db.apiKey.update({
    where: { id: apiKeyId, organizationId },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId: revokedBy,
    action: 'api_key.deleted',
    entityType: 'api_key',
    entityId: apiKeyId,
    description: `API key "${apiKey.name}" revoked`,
  });

  return apiKey;
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(organizationId: string) {
  return db.apiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      expiresAt: true,
      createdAt: true,
      createdBy: true,
      rateLimit: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Middleware to authenticate API requests
 */
export async function authenticateApiRequest() {
  const headersList = headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const key = authHeader.substring(7);
  const result = await validateApiKey(key);

  if (!result) {
    return { error: 'Invalid API key', status: 401 };
  }

  const { apiKey, organization } = result;

  // Check rate limit
  const rateLimit = await checkRateLimit(apiKey.id, apiKey.rateLimit);
  if (!rateLimit.allowed) {
    return {
      error: 'Rate limit exceeded',
      status: 429,
      headers: {
        'X-RateLimit-Limit': apiKey.rateLimit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
      },
    };
  }

  return {
    apiKey,
    organization,
    headers: {
      'X-RateLimit-Limit': apiKey.rateLimit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    },
  };
}

// Available API scopes
export const API_SCOPES = [
  { value: 'cases.read', label: 'Read cases' },
  { value: 'cases.write', label: 'Create and update cases' },
  { value: 'cases.delete', label: 'Delete cases' },
  { value: 'forms.read', label: 'Read forms' },
  { value: 'forms.write', label: 'Create and update forms' },
  { value: 'recordings.read', label: 'Read recordings' },
  { value: 'recordings.write', label: 'Create recordings' },
  { value: 'recordings.transcribe', label: 'Transcribe recordings' },
  { value: 'members.read', label: 'Read team members' },
  { value: 'webhooks.manage', label: 'Manage webhooks' },
  { value: '*', label: 'Full access (all permissions)' },
] as const;
