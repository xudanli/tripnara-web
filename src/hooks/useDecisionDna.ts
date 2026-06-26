import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decisionDnaApi } from '@/api/decision-dna';
import { useAuth } from '@/hooks/useAuth';
import {
  DECISION_DNA_CONSENT_QUERY_KEY,
  triggerDecisionDnaConsentNudge,
} from '@/lib/decision-dna-consent-nudge';
import type { UpdateDecisionDnaConsentRequest } from '@/types/decision-os';

export const DECISION_DNA_CONSENT_KEY = DECISION_DNA_CONSENT_QUERY_KEY;

export function useDecisionDnaConsent() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: DECISION_DNA_CONSENT_KEY,
    queryFn: () => decisionDnaApi.getConsent(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useUpdateDecisionDnaConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDecisionDnaConsentRequest) => decisionDnaApi.updateConsent(body),
    onSuccess: (data) => {
      queryClient.setQueryData(DECISION_DNA_CONSENT_KEY, data);
    },
  });
}

/** 方案回滚/改选成功后，未 opt-in 隐式学习时轻提示引导去设置页 */
export function useDecisionDnaConsentNudge() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const triggerAfterRollback = useCallback(async () => {
    if (!isAuthenticated) return;
    await triggerDecisionDnaConsentNudge(() =>
      queryClient.fetchQuery({
        queryKey: DECISION_DNA_CONSENT_KEY,
        queryFn: () => decisionDnaApi.getConsent(),
        staleTime: 60_000,
      }),
    );
  }, [isAuthenticated, queryClient]);

  return { triggerAfterRollback };
}
