import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectFitAdminApi } from '@/api/project-fit-admin';
import type {
  ProjectFitAppealStatus,
  ResolveProjectFitAppealRequest,
  TriageProjectFitAppealRequest,
} from '@/types/project-fit';

export const projectFitAppealsQueryKey = (statuses?: ProjectFitAppealStatus[]) =>
  ['project-fit-admin', 'appeals', statuses?.join(',') ?? 'SUBMITTED,TRIAGED'] as const;

export function usePendingProjectFitAppeals(statuses?: ProjectFitAppealStatus[]) {
  return useQuery({
    queryKey: projectFitAppealsQueryKey(statuses),
    queryFn: () => projectFitAdminApi.listPendingAppeals(statuses),
    staleTime: 15_000,
  });
}

export function useTriageProjectFitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { appealId: string; body?: TriageProjectFitAppealRequest }) =>
      projectFitAdminApi.triageAppeal(params.appealId, params.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-fit-admin', 'appeals'] });
    },
  });
}

export function useStartProjectFitAppealReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appealId: string) => projectFitAdminApi.startAppealReview(appealId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-fit-admin', 'appeals'] });
    },
  });
}

export function useResolveProjectFitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { appealId: string; body: ResolveProjectFitAppealRequest }) =>
      projectFitAdminApi.resolveAppeal(params.appealId, params.body),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['project-fit-admin', 'appeals'] });
      void queryClient.invalidateQueries({ queryKey: ['project-fit', 'applications'] });
      if (result.overturnEffects?.reopenedApplicationIds?.length) {
        for (const id of result.overturnEffects.reopenedApplicationIds) {
          void queryClient.invalidateQueries({ queryKey: ['project-fit', 'application', id] });
        }
      }
    },
  });
}

export function useExpireOutdatedFitAssessments() {
  return useMutation({
    mutationFn: () => projectFitAdminApi.expireOutdatedAssessments(),
  });
}
