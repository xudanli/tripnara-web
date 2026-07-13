import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripMemberInvitesApi } from '@/api/trip-member-invites';
import { useTripMemberInviteContext } from '@/hooks/useInviteResolver';
import { roleSlotToMemberTripRole } from '@/lib/trip-member-roles.util';
import {
  createEmptyMemberOnboardingDraft,
  readMemberOnboardingDraft,
  validateMemberOnboardingStep,
  writeMemberOnboardingDraft,
} from '@/lib/member-onboarding-storage';
import type { MemberOnboardingDraft, MemberOnboardingStepId, TripMemberInviteContext } from '@/types/member-onboarding';

function applyInviteContextToDraft(
  draft: MemberOnboardingDraft,
  ctx: TripMemberInviteContext | undefined,
): MemberOnboardingDraft {
  if (!ctx) return draft;
  const roleSlot = ctx.roleSlot;
  return {
    ...draft,
    tripId: draft.tripId ?? ctx.tripId,
    roleSlot: draft.roleSlot ?? roleSlot,
    tripRole:
      draft.roleSlot || !roleSlot
        ? draft.tripRole
        : roleSlotToMemberTripRole(roleSlot),
  };
}

export function useMemberOnboarding(token: string | undefined) {
  const queryClient = useQueryClient();
  const { data: inviteContext } = useTripMemberInviteContext(token);

  const query = useQuery({
    queryKey: ['member-onboarding', token],
    queryFn: async () => {
      if (!token) return null;
      const remote = await tripMemberInvitesApi.getOnboarding(token);
      const base =
        remote ?? readMemberOnboardingDraft(token) ?? createEmptyMemberOnboardingDraft(token);
      return base;
    },
    enabled: Boolean(token),
    staleTime: 0,
  });

  const [draft, setDraft] = useState<MemberOnboardingDraft | null>(null);

  useEffect(() => {
    if (query.data) {
      setDraft(applyInviteContextToDraft(query.data, inviteContext));
    }
  }, [query.data, inviteContext]);

  const persist = useCallback(
    async (next: MemberOnboardingDraft) => {
      const withContext = applyInviteContextToDraft(next, inviteContext);
      setDraft(withContext);
      writeMemberOnboardingDraft(withContext);
      try {
        await tripMemberInvitesApi.saveOnboarding(withContext.inviteToken, withContext);
      } catch {
        /* local draft already saved */
      }
    },
    [inviteContext],
  );

  const saveStep = useCallback(
    async (stepId: MemberOnboardingStepId, partial: Partial<MemberOnboardingDraft>) => {
      if (!draft) return;
      const next = { ...draft, ...partial, currentStepId: stepId };
      await persist(next);
    },
    [draft, persist],
  );

  const submitMutation = useMutation({
    mutationFn: (finalDraft: MemberOnboardingDraft) => {
      const withContext = applyInviteContextToDraft(finalDraft, inviteContext);
      return tripMemberInvitesApi.submitOnboarding(withContext.inviteToken, withContext);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['member-onboarding', token] });
      void queryClient.invalidateQueries({ queryKey: ['trip-member-invite', 'context', token] });
    },
  });

  return {
    draft,
    isLoading: query.isLoading,
    saveStep,
    validateStep: (stepId: MemberOnboardingStepId) =>
      draft ? validateMemberOnboardingStep(stepId, draft) : '加载中…',
    submit: submitMutation,
    inviteContext,
  };
}
