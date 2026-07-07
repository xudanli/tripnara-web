import { useCallback, useEffect, useState } from 'react';
import { decisionProblemsApi } from '@/api/decision-problems';
import type { DecisionOutcomeValidation } from '@/types/decision-problem';

export interface UseDecisionOutcomeValidationOptions {
  tripId: string;
  decisionId: string | null | undefined;
  enabled?: boolean;
}

export function useDecisionOutcomeValidation({
  tripId,
  decisionId,
  enabled = true,
}: UseDecisionOutcomeValidationOptions) {
  const [validation, setValidation] = useState<DecisionOutcomeValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !tripId || !decisionId) {
      setValidation(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await decisionProblemsApi.getDecisionValidation(tripId, decisionId);
      setValidation(data);
      return data;
    } catch (err) {
      if (decisionProblemsApi.isNotImplemented(err)) {
        setValidation(null);
        setError(null);
        return null;
      }
      setError(err instanceof Error ? err.message : '加载决策验证失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, decisionId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string; decisionId?: string }>).detail;
      if (!detail?.tripId || detail.tripId !== tripId) return;
      if (detail.decisionId && detail.decisionId !== decisionId) return;
      void reload();
    };
    window.addEventListener('plan-studio:decision-validation-refresh', handler);
    return () => window.removeEventListener('plan-studio:decision-validation-refresh', handler);
  }, [tripId, decisionId, reload]);

  return { validation, loading, error, reload };
}
