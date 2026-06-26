import type { OrganizationTrustProfile, UserTrustProfile } from '@/types/identity-governance';

export function buildMockUserTrustProfile(userId: string): UserTrustProfile {
  return {
    subjectType: 'USER',
    subjectId: userId,
    displayName: '示例向导',
    verification: {
      emailVerified: true,
      phoneVerified: true,
      realNameVerified: false,
      ageVerified: false,
    },
    professional: {
      isVerifiedProfessional: true,
      verifiedAt: '2026-01-15T00:00:00.000Z',
      bio: '冰岛高地与斯堪的纳维亚徒步向导',
      destinations: ['IS', 'NO'],
      yearsOfExperience: 8,
    },
    agency: null,
    qualifications: [
      {
        id: 'q-1',
        subjectType: 'USER',
        subjectId: userId,
        qualificationType: 'OUTDOOR_GUIDE',
        issuer: '示例户外协会',
        status: 'VERIFIED',
        validUntil: '2027-12-31',
      },
    ],
    endorsements: [],
    reputationFacts: {
      projectsCompleted: 12,
      projectsCancelledByProvider: 0,
      memberWithdrawals: 1,
      complaintsConfirmed: 0,
      paymentDisputesUnresolved: 0,
      planBExecuted: 2,
      safetyIncidentsConfirmed: 0,
      lastProjectCompletedAt: '2026-05-20T00:00:00.000Z',
    },
  };
}

export function buildMockOrganizationTrustProfile(
  organizationId: string
): OrganizationTrustProfile {
  return {
    subjectType: 'ORGANIZATION',
    subjectId: organizationId,
    displayName: '示例户外机构',
    verification: {
      emailVerified: true,
      phoneVerified: true,
      realNameVerified: true,
      ageVerified: false,
    },
    qualifications: [
      {
        id: 'oq-1',
        subjectType: 'ORGANIZATION',
        subjectId: organizationId,
        qualificationType: 'OUTBOUND_TRAVEL_AGENCY',
        issuer: '示例文旅主管部门',
        status: 'VERIFIED',
        validUntil: '2027-12-31',
      },
    ],
    endorsements: [],
    reputationFacts: {
      projectsCompleted: 24,
      projectsCancelledByProvider: 1,
      memberWithdrawals: 2,
      complaintsConfirmed: 0,
      paymentDisputesUnresolved: 0,
      planBExecuted: 3,
      safetyIncidentsConfirmed: 0,
      lastProjectCompletedAt: '2026-05-18T00:00:00.000Z',
    },
  };
}
