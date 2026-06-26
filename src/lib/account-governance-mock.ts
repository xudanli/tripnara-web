import type { AccountCapabilities } from '@/types/account-governance';
import type { User } from '@/api/user';

/** R0 开发占位 — 从 /users/me 推导基础能力，待后端 /account/capabilities 就绪后替换 */
export function buildMockAccountCapabilities(user: User | null | undefined): AccountCapabilities {
  const userId = user?.id ?? 'local-user';
  const verifications: AccountCapabilities['verifications'] = [];

  if (user?.email) {
    verifications.push({
      userId,
      type: 'EMAIL',
      status: user.emailVerified ? 'VERIFIED' : 'NOT_STARTED',
      verifiedAt: user.emailVerified ? user.updatedAt : null,
      expiresAt: null,
    });
  }

  return {
    userId,
    activeContext: { type: 'personal' },
    verifications,
    publishingPermission: {
      subjectType: 'user',
      subjectId: userId,
      level: 'PRIVATE_ONLY',
      status: 'ACTIVE',
      reason: null,
      grantedAt: null,
    },
    subscriptions: [{ plan: 'FREE', status: 'ACTIVE' }],
    projectRoles: [],
    organizationRoles: [],
    professionalVerified: false,
    agencyVerified: false,
  };
}
