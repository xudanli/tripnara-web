import { useQuery } from '@tanstack/react-query';
import { identityGovernanceApi, isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import {
  buildMockOrganizationTrustProfile,
  buildMockUserTrustProfile,
} from '@/lib/trust-profile-mock';
import { useAuth } from '@/hooks/useAuth';

export const TRUST_PROFILE_ME_QUERY_KEY = ['identity', 'trust-profile', 'me'] as const;

export function useMyTrustProfile() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: TRUST_PROFILE_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await identityGovernanceApi.getMyTrustProfile();
      } catch (error) {
        if (
          import.meta.env.DEV &&
          user?.id &&
          (isIdentityApiNotReady(error) || isApiNotReadyError(error))
        ) {
          return buildMockUserTrustProfile(user.id);
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useUserTrustProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'trust-profile', 'user', userId] as const,
    queryFn: async () => {
      try {
        return await identityGovernanceApi.getUserTrustProfile(userId!);
      } catch (error) {
        if (
          import.meta.env.DEV &&
          userId &&
          (isIdentityApiNotReady(error) || isApiNotReadyError(error))
        ) {
          return buildMockUserTrustProfile(userId);
        }
        throw error;
      }
    },
    enabled: Boolean(userId),
    staleTime: 120_000,
  });
}

export function useOrganizationTrustProfile(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'trust-profile', 'organization', organizationId] as const,
    queryFn: async () => {
      try {
        return await identityGovernanceApi.getOrganizationTrustProfile(organizationId!);
      } catch (error) {
        if (
          import.meta.env.DEV &&
          organizationId &&
          (isIdentityApiNotReady(error) || isApiNotReadyError(error))
        ) {
          return buildMockOrganizationTrustProfile(organizationId);
        }
        throw error;
      }
    },
    enabled: Boolean(organizationId),
    staleTime: 120_000,
  });
}

export function useReputationSummary(
  subjectType: 'USER' | 'ORGANIZATION',
  subjectId: string | undefined
) {
  return useQuery({
    queryKey: ['identity', 'reputation', subjectType, subjectId] as const,
    queryFn: () => identityGovernanceApi.getReputationSummary(subjectType, subjectId!),
    enabled: Boolean(subjectId),
    staleTime: 120_000,
  });
}
