import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { identityGovernanceApi, isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import type { SubmitQualificationRequest } from '@/types/identity-governance';

export const MY_QUALIFICATIONS_QUERY_KEY = ['identity', 'qualifications', 'mine'] as const;

export function useMyQualifications() {
  return useQuery({
    queryKey: MY_QUALIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      try {
        return await identityGovernanceApi.getMyQualifications();
      } catch (error) {
        if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
          return [];
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useSubmitQualification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmitQualificationRequest) =>
      identityGovernanceApi.submitQualification(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_QUALIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['identity', 'trust-profile'] });
    },
  });
}
