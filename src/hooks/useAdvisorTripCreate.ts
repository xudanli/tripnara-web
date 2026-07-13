import { useMutation, useQuery } from '@tanstack/react-query';
import { advisorTripCreateApi } from '@/api/advisor-trip-create';
import { identityGovernanceApi } from '@/api/identity-governance';
import { userApi } from '@/api/user';
import {
  filterStaffByRoles,
  normalizeOrganizationStaff,
  resolveActiveOrganizationId,
} from '@/lib/advisor-trip-create.util';
import type {
  AdvisorTripCreateFormState,
  CreateAdvisorTripRequest,
} from '@/types/advisor-trip-create';

export function useCreateAdvisorTrip() {
  return useMutation({
    mutationFn: (input: {
      body: CreateAdvisorTripRequest;
      formSnapshot?: AdvisorTripCreateFormState;
    }) => advisorTripCreateApi.create(input.body, { formSnapshot: input.formSnapshot }),
  });
}

export function useOrganizationStaff(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization', 'staff', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      try {
        const raw = await identityGovernanceApi.getOrganizationMembers(organizationId);
        return normalizeOrganizationStaff(raw);
      } catch {
        return [];
      }
    },
    enabled: Boolean(organizationId),
    staleTime: 60_000,
  });
}

export function useAdvisorTripCreateContext() {
  return useQuery({
    queryKey: ['advisor-trip-create', 'context'],
    queryFn: async () => {
      const user = await userApi.getMe();
      return {
        userId: user.id,
        displayName: user.displayName ?? user.email ?? '当前用户',
      };
    },
    staleTime: 60_000,
  });
}

export function useAdvisorStaffOptions(organizationId: string | undefined) {
  const query = useOrganizationStaff(organizationId);
  const advisors = filterStaffByRoles(query.data ?? [], [
    'ADVISOR',
    'AGENCY_ADMIN',
    'OWNER',
    'OPERATIONS',
  ]);
  const leaders = filterStaffByRoles(query.data ?? [], ['LEADER', 'ADVISOR', 'AGENCY_ADMIN']);
  return { ...query, advisors, leaders };
}

export function useResolvedOrganizationId(
  caps: { activeContext: { type: string; organizationId?: string }; organizationRoles?: Array<{ organizationId: string; status: string }> } | null | undefined,
) {
  return resolveActiveOrganizationId(caps ?? undefined);
}
