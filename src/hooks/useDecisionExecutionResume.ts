import { useMemo } from 'react';
import { useDecisionExecutionPolling } from '@/hooks/useDecisionExecutionPolling';
import { classifyExecutionStatusPoll } from '@/generated/decision-semantics-contracts';
import type { DecisionExecutionStatusResponse } from '@/types/decision-problem';

export interface UseDecisionExecutionResumeOptions {
  tripId: string;
  decisionId: string | null | undefined;
  enabled?: boolean;
  initialStatus?: DecisionExecutionStatusResponse | null;
  onTerminal?: (status: DecisionExecutionStatusResponse) => void;
}

/**
 * 根据 decisionId 恢复 execution-status 轮询（页面刷新 / 切后台 / 深链 ?decisionId=）
 * 分类逻辑复用 decision-center-execution-state-machine SSOT。
 */
export function useDecisionExecutionResume({
  tripId,
  decisionId,
  enabled = true,
  initialStatus = null,
  onTerminal,
}: UseDecisionExecutionResumeOptions) {
  const polling = useDecisionExecutionPolling({
    tripId,
    decisionId,
    enabled,
    initialStatus,
    autoStart: true,
    onTerminal,
  });

  const classification = useMemo(() => {
    if (!polling.status) return null;
    return classifyExecutionStatusPoll(polling.status, {
      effectiveDecisionId: decisionId ?? undefined,
    });
  }, [polling.status, decisionId]);

  return {
    ...polling,
    classification,
    isTerminal: classification?.isTerminal ?? false,
    variant: classification?.variant ?? 'in_progress',
  };
}
