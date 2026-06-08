import { useQuery } from '@tanstack/react-query';
import { odysseyIntakeApi } from '@/api/odyssey-intake';
import { normalizePremiumStressQuestions } from '@/features/odyssey-intake/lib/normalize-premium-stress-questions';

export function useOdysseyOnboardingStatus() {
  return useQuery({
    queryKey: ['odyssey-intake', 'onboarding', 'status'],
    queryFn: () => odysseyIntakeApi.getOnboardingStatus(),
    staleTime: 10_000,
  });
}

export function useOdysseyQuestions(enabled = true) {
  return useQuery({
    queryKey: ['odyssey-intake', 'questions'],
    queryFn: () => odysseyIntakeApi.getQuestions(),
    enabled,
    staleTime: 300_000,
    retry: 1,
  });
}

/** Premium v2 · 行中博弈抗压题（提交时 scenarioId 使用 API 返回的 id） */
export function usePremiumStressQuestions(enabled = true) {
  return useQuery({
    queryKey: ['odyssey-intake', 'premium-stress-test', 'questions'],
    queryFn: async () => {
      const res = await odysseyIntakeApi.getPremiumStressTestQuestions();
      return normalizePremiumStressQuestions(res);
    },
    enabled,
    staleTime: 300_000,
    retry: 1,
  });
}

/** 是否需要拉取/展示测评题（未完成测评，或 status 不可用） */
export function shouldLoadOdysseyQuestions(
  status: { quizComplete?: boolean } | undefined,
  statusError: boolean
): boolean {
  if (statusError || status == null) return true;
  return status.quizComplete !== true;
}
