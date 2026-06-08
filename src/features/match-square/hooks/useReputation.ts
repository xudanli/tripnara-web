import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reputationApi } from '@/api/reputation';

export function usePendingReputationSurveys(enabled = true) {
  return useQuery({
    queryKey: ['reputation-os', 'pending-surveys'],
    queryFn: () => reputationApi.getPendingSurveys(),
    staleTime: 30_000,
    enabled,
  });
}

export function useReputationSurveyQuestions(enabled = true) {
  return useQuery({
    queryKey: ['reputation-os', 'survey-questions'],
    queryFn: () => reputationApi.getSurveyQuestions(),
    staleTime: 300_000,
    enabled,
  });
}

export function useReputationProfileMe() {
  return useQuery({
    queryKey: ['reputation-os', 'profile-me'],
    queryFn: () => reputationApi.getProfileMe(),
    staleTime: 60_000,
  });
}

export function useUserReputationProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['reputation-os', 'user-profile', userId],
    queryFn: () => reputationApi.getUserProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUserSafetyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['reputation-os', 'user-safety', userId],
    queryFn: () => reputationApi.getUserSafety(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useSubmitReputationSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reputationApi.submitSurvey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reputation-os'] });
      qc.invalidateQueries({ queryKey: ['odyssey-intake', 'profile'] });
    },
  });
}

/** 首个有待评旅伴且未完成的 campaign */
export function pickActiveCampaign(
  campaigns: import('@/types/reputation').PendingSurveyCampaign[] | undefined
) {
  if (!campaigns?.length) return null;
  return (
    campaigns.find(
      (c) => !c.isComplete && (c.companionsToRate ?? []).some((x) => !x.alreadyRated)
    ) ?? null
  );
}

export function unratedCompanions(campaign: import('@/types/reputation').PendingSurveyCampaign) {
  return (campaign.companionsToRate ?? []).filter((c) => !c.alreadyRated);
}
