import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { identityGovernanceAdminApi } from '@/api/identity-governance-admin';
import { identityGovernanceApi } from '@/api/identity-governance';
import type { ResolveReputationDisputeRequest, SubmitReputationDisputeRequest } from '@/types/identity-governance';

export function useSubmitReputationDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitReputationDisputeRequest) =>
      identityGovernanceApi.submitReputationDispute(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reputation-disputes', 'mine'] });
    },
  });
}

export function useMyReputationDisputes() {
  return useQuery({
    queryKey: ['reputation-disputes', 'mine'] as const,
    queryFn: () => identityGovernanceApi.listMyReputationDisputes(),
    staleTime: 60_000,
  });
}

export function usePendingReputationDisputes() {
  return useQuery({
    queryKey: ['reputation-disputes-admin', 'pending'] as const,
    queryFn: () => identityGovernanceAdminApi.listPendingReputationDisputes(),
    staleTime: 15_000,
  });
}

export function useResolveReputationDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { disputeId: string; body: ResolveReputationDisputeRequest }) =>
      identityGovernanceAdminApi.resolveReputationDispute(params.disputeId, params.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reputation-disputes-admin', 'pending'] });
    },
  });
}

export function useStartReputationDisputeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (disputeId: string) =>
      identityGovernanceAdminApi.startReputationDisputeReview(disputeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reputation-disputes-admin', 'pending'] });
    },
  });
}
