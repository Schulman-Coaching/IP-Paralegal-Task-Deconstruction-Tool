import { auth, currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { db } from './db';
import { MemberRole } from '@prisma/client';

export type AuthUser = {
  userId: string;
  orgId: string | null;
  orgSlug: string | null;
  role: MemberRole;
};

/**
 * Get the current authenticated user with organization context
 */
export async function getAuth(): Promise<AuthUser | null> {
  const { userId, orgId, orgSlug } = auth();

  if (!userId) {
    return null;
  }

  let role: MemberRole = MemberRole.MEMBER;

  if (orgId) {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });
    if (member) {
      role = member.role;
    }
  }

  return {
    userId,
    orgId,
    orgSlug,
    role,
  };
}

/**
 * Require authentication - redirects to sign-in if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const authUser = await getAuth();

  if (!authUser) {
    redirect('/sign-in');
  }

  return authUser;
}

/**
 * Require organization context
 */
export async function requireOrg(): Promise<AuthUser & { orgId: string }> {
  const authUser = await requireAuth();

  if (!authUser.orgId) {
    redirect('/select-org');
  }

  return authUser as AuthUser & { orgId: string };
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(userRole: MemberRole, requiredRole: MemberRole): boolean {
  const roleHierarchy: Record<MemberRole, number> = {
    [MemberRole.VIEWER]: 0,
    [MemberRole.MEMBER]: 1,
    [MemberRole.ADMIN]: 2,
    [MemberRole.OWNER]: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Require minimum role
 */
export async function requireRole(minimumRole: MemberRole): Promise<AuthUser> {
  const authUser = await requireOrg();

  if (!hasRole(authUser.role, minimumRole)) {
    redirect('/unauthorized');
  }

  return authUser;
}

/**
 * Get current organization
 */
export async function getCurrentOrganization() {
  const authUser = await getAuth();

  if (!authUser?.orgId) {
    return null;
  }

  return db.organization.findUnique({
    where: { clerkOrgId: authUser.orgId },
    include: {
      _count: {
        select: {
          members: true,
          cases: true,
          forms: true,
        },
      },
    },
  });
}

/**
 * Sync organization from Clerk to database
 */
export async function syncOrganization(clerkOrgId: string, data: {
  name: string;
  slug: string;
  logo?: string;
}) {
  return db.organization.upsert({
    where: { clerkOrgId },
    update: {
      name: data.name,
      slug: data.slug,
      logo: data.logo,
    },
    create: {
      clerkOrgId,
      name: data.name,
      slug: data.slug,
      logo: data.logo,
    },
  });
}

/**
 * Sync organization membership
 */
export async function syncMembership(
  organizationId: string,
  userId: string,
  role: MemberRole
) {
  return db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    update: { role },
    create: {
      organizationId,
      userId,
      role,
    },
  });
}
