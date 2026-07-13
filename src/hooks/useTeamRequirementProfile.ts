import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripMemberOnboardingProfilesApi } from '@/api/trip-member-onboarding-profiles';
import { buildTeamRequirementProfile } from '@/lib/team-requirement-profile.util';
import { useFrictionRadar } from '@/hooks/useDecisionProfiling';
import type { TeamRequirementProfile } from '@/types/team-requirement-profile';

export interface UseTeamRequirementProfileOptions {
  collaborators?: Array<{ userId: string; displayName?: string | null; role?: string }>;
  enabled?: boolean;
  includeFriction?: boolean;
}

export function teamRequirementProfileQueryKey(tripId: string) {
  return ['trips', tripId, 'member-onboarding-profiles'] as const;
}

export function useTeamRequirementProfile(
  tripId: string | undefined,
  options?: UseTeamRequirementProfileOptions,
) {
  const enabled = Boolean(tripId) && (options?.enabled ?? true);
  const includeFriction = options?.includeFriction ?? true;

  const profilesQuery = useQuery({
    queryKey: tripId ? teamRequirementProfileQueryKey(tripId) : ['trips', 'member-onboarding-profiles'],
    queryFn: () => tripMemberOnboardingProfilesApi.list(tripId!),
    enabled,
    staleTime: 60_000,
  });

  const { data: friction, loading: frictionLoading } = useFrictionRadar(
    tripId,
    enabled && includeFriction,
  );

  const profile = useMemo((): TeamRequirementProfile | null => {
    if (!profilesQuery.data) return null;
    return buildTeamRequirementProfile({
      response: profilesQuery.data,
      collaborators: options?.collaborators,
      frictionAlerts: friction?.highRiskAlerts,
    });
  }, [profilesQuery.data, options?.collaborators, friction?.highRiskAlerts]);

  return {
    profile,
    dataSource: profilesQuery.data?.source,
    loading: profilesQuery.isLoading || (includeFriction && frictionLoading && !profile),
    error: profilesQuery.error,
    refetch: profilesQuery.refetch,
    isFetching: profilesQuery.isFetching,
    frictionMatrix: friction?.frictionMatrix ?? [],
  };
}
