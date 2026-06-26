import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { participantPortalApi } from '@/api/participant-portal';
import { useAuth } from '@/hooks/useAuth';
import type {
  AcceptParticipantInviteRequest,
  AckChangeNoticeRequest,
  ParticipantOutcomeFeedbackRequest,
  ParticipantPreferencesRequest,
  PatchReadinessTaskRequest,
  SubmitParticipantConsentRequest,
  SubmitProposalFeedbackRequest,
} from '@/types/participant-portal';

export const participantMyProjectsKey = ['participant', 'me', 'projects'] as const;

export function participantInviteKey(token: string) {
  return ['participant', 'invite', token] as const;
}

export function participantDashboardKey(token: string) {
  return ['participant', 'dashboard', token] as const;
}

export function participantPreferencesKey(token: string) {
  return ['participant', 'preferences', token] as const;
}

export function participantProposalKey(token: string, candidateId: string) {
  return ['participant', 'proposal', token, candidateId] as const;
}

export function participantReadinessKey(token: string) {
  return ['participant', 'readiness', token] as const;
}

export function participantChangeNoticesKey(token: string) {
  return ['participant', 'change-notices', token] as const;
}

export function participantChangeNoticeKey(token: string, noticeId: string) {
  return ['participant', 'change-notice', token, noticeId] as const;
}

export function participantNotificationsKey(token: string) {
  return ['participant', 'notifications', token] as const;
}

export function participantPrivateConstraintsKey(token: string) {
  return ['participant', 'private-constraints', token] as const;
}

export function participantTrustSurfaceKey(token: string) {
  return ['participant', 'trust-surface', token] as const;
}

async function fetchInvite(token: string) {
  try {
    return await participantPortalApi.getInvite(token);
  } catch {
    return participantPortalApi.getInvitation(token);
  }
}

function invalidateParticipantToken(
  queryClient: ReturnType<typeof useQueryClient>,
  token: string,
) {
  void queryClient.invalidateQueries({ queryKey: participantInviteKey(token) });
  void queryClient.invalidateQueries({ queryKey: participantDashboardKey(token) });
  void queryClient.invalidateQueries({ queryKey: participantPreferencesKey(token) });
}

export function useParticipantMyProjects() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: participantMyProjectsKey,
    queryFn: () => participantPortalApi.listMyProjects(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useParticipantInvite(token: string | undefined) {
  return useQuery({
    queryKey: participantInviteKey(token ?? ''),
    queryFn: () => fetchInvite(token!),
    enabled: Boolean(token),
    staleTime: 0,
    retry: false,
  });
}

export function useParticipantDashboard(token: string | undefined) {
  return useQuery({
    queryKey: participantDashboardKey(token ?? ''),
    queryFn: () => participantPortalApi.getDashboard(token!),
    enabled: Boolean(token),
    staleTime: 15_000,
  });
}

export function useParticipantTrustSurface(token: string | undefined) {
  return useQuery({
    queryKey: participantTrustSurfaceKey(token ?? ''),
    queryFn: () => participantPortalApi.getTrustSurface(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
    retry: (count, error) => {
      if (error instanceof Error && /404|not found/i.test(error.message)) return false;
      return count < 1;
    },
  });
}

export function useParticipantPreferences(token: string | undefined) {
  return useQuery({
    queryKey: participantPreferencesKey(token ?? ''),
    queryFn: () => participantPortalApi.getPreferences(token!),
    enabled: Boolean(token),
  });
}

export function useParticipantProposal(token: string | undefined, candidateId: string | undefined) {
  return useQuery({
    queryKey: participantProposalKey(token ?? '', candidateId ?? ''),
    queryFn: () => participantPortalApi.getProposal(token!, candidateId!),
    enabled: Boolean(token && candidateId),
  });
}

export function useParticipantReadiness(token: string | undefined) {
  return useQuery({
    queryKey: participantReadinessKey(token ?? ''),
    queryFn: () => participantPortalApi.getReadiness(token!),
    enabled: Boolean(token),
  });
}

export function useParticipantChangeNotices(token: string | undefined) {
  return useQuery({
    queryKey: participantChangeNoticesKey(token ?? ''),
    queryFn: () => participantPortalApi.listChangeNotices(token!),
    enabled: Boolean(token),
  });
}

export function useParticipantChangeNotice(
  token: string | undefined,
  noticeId: string | undefined,
) {
  return useQuery({
    queryKey: participantChangeNoticeKey(token ?? '', noticeId ?? ''),
    queryFn: () => participantPortalApi.getChangeNotice(token!, noticeId!),
    enabled: Boolean(token && noticeId),
  });
}

export function useParticipantNotifications(token: string | undefined) {
  return useQuery({
    queryKey: participantNotificationsKey(token ?? ''),
    queryFn: () => participantPortalApi.listNotifications(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useParticipantPrivateConstraintsMeta(token: string | undefined) {
  return useQuery({
    queryKey: participantPrivateConstraintsKey(token ?? ''),
    queryFn: () => participantPortalApi.listPrivateConstraintMeta(token!),
    enabled: Boolean(token),
  });
}

export function useAcceptParticipantInvite(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: AcceptParticipantInviteRequest) =>
      participantPortalApi.acceptInvite(token, body),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: participantInviteKey(token) });
    },
  });
}

export function useSubmitParticipantConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitParticipantConsentRequest) =>
      participantPortalApi.submitConsent(body),
    onSuccess: async (_data, variables) => {
      await queryClient.refetchQueries({
        queryKey: participantInviteKey(variables.inviteToken),
      });
      invalidateParticipantToken(queryClient, variables.inviteToken);
    },
  });
}

export function useSaveParticipantPreferences(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ParticipantPreferencesRequest) =>
      participantPortalApi.savePreferences(token, body),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: participantInviteKey(token) });
      invalidateParticipantToken(queryClient, token);
    },
  });
}

export function useParticipantWithdraw(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => participantPortalApi.withdraw(token),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: participantInviteKey(token) });
      invalidateParticipantToken(queryClient, token);
    },
  });
}

export function useSubmitProposalFeedback(token: string, candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitProposalFeedbackRequest) =>
      participantPortalApi.submitProposalFeedback(token, candidateId, body),
    onSuccess: () => {
      invalidateParticipantToken(queryClient, token);
      void queryClient.invalidateQueries({
        queryKey: participantProposalKey(token, candidateId),
      });
    },
  });
}

export function usePatchReadinessTask(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: PatchReadinessTaskRequest }) =>
      participantPortalApi.patchReadinessTask(token, taskId, body),
    onSuccess: () => {
      invalidateParticipantToken(queryClient, token);
      void queryClient.invalidateQueries({ queryKey: participantReadinessKey(token) });
    },
  });
}

export function useAckChangeNotice(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noticeId, body }: { noticeId: string; body?: AckChangeNoticeRequest }) =>
      participantPortalApi.ackChangeNotice(token, noticeId, body),
    onSuccess: (_data, variables) => {
      invalidateParticipantToken(queryClient, token);
      void queryClient.invalidateQueries({ queryKey: participantChangeNoticesKey(token) });
      void queryClient.invalidateQueries({
        queryKey: participantChangeNoticeKey(token, variables.noticeId),
      });
    },
  });
}

export function useSubmitParticipantOutcomeFeedback(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ParticipantOutcomeFeedbackRequest) =>
      participantPortalApi.submitOutcomeFeedback(token, body),
    onSuccess: () => invalidateParticipantToken(queryClient, token),
  });
}
