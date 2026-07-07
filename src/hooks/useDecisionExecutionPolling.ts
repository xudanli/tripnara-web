import { useCallback, useEffect, useRef, useState } from 'react';
import { decisionProblemsApi } from '@/api/decision-problems';
import { shouldPollDecisionExecution } from '@/generated/decision-semantics-contracts';
import type { DecisionExecutionStatusResponse } from '@/types/decision-problem';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 40;

export interface UseDecisionExecutionPollingOptions {
  tripId: string;
  decisionId: string | null | undefined;
  enabled?: boolean;
  /** 初始状态（POST decisions 响应可传入，减少首次轮询延迟） */
  initialStatus?: DecisionExecutionStatusResponse | null;
  /** decisionId 就绪时自动拉取 execution-status 并续 poll（深链恢复） */
  autoStart?: boolean;
  onTerminal?: (status: DecisionExecutionStatusResponse) => void;
}

export function useDecisionExecutionPolling({
  tripId,
  decisionId,
  enabled = true,
  initialStatus = null,
  autoStart = false,
  onTerminal,
}: UseDecisionExecutionPollingOptions) {
  const [status, setStatus] = useState<DecisionExecutionStatusResponse | null>(initialStatus);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!tripId || !decisionId) return null;
    try {
      setError(null);
      const next = await decisionProblemsApi.getDecisionExecutionStatus(tripId, decisionId);
      setStatus(next);
      if (!shouldPollDecisionExecution(next.status)) {
        setPolling(false);
        onTerminal?.(next);
        return next;
      }
      return next;
    } catch (err) {
      if (decisionProblemsApi.isNotImplemented(err)) {
        setPolling(false);
        return null;
      }
      setError(err instanceof Error ? err.message : '查询执行状态失败');
      setPolling(false);
      return null;
    }
  }, [tripId, decisionId, onTerminal]);

  const startPolling = useCallback(() => {
    if (!enabled || !tripId || !decisionId) return;
    clearTimer();
    attemptsRef.current = 0;
    setPolling(true);

    const tick = async () => {
      attemptsRef.current += 1;
      const next = await pollOnce();
      if (next && !shouldPollDecisionExecution(next.status)) return;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setPolling(false);
        return;
      }
      timerRef.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    void tick();
  }, [enabled, tripId, decisionId, pollOnce, clearTimer]);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      if (shouldPollDecisionExecution(initialStatus.status)) {
        startPolling();
      }
    }
  }, [initialStatus, startPolling]);

  useEffect(() => {
    if (!autoStart || !enabled || !tripId || !decisionId) return;
    if (initialStatus && shouldPollDecisionExecution(initialStatus.status)) return;

    let cancelled = false;
    clearTimer();
    attemptsRef.current = 0;
    setPolling(true);
    setError(null);

    void (async () => {
      try {
        const next = await decisionProblemsApi.getDecisionExecutionStatus(tripId, decisionId);
        if (cancelled) return;
        setStatus(next);
        if (shouldPollDecisionExecution(next.status)) {
          startPolling();
        } else {
          setPolling(false);
          onTerminal?.(next);
        }
      } catch (err) {
        if (cancelled) return;
        if (decisionProblemsApi.isNotImplemented(err)) {
          setPolling(false);
          return;
        }
        setError(err instanceof Error ? err.message : '查询执行状态失败');
        setPolling(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [autoStart, enabled, tripId, decisionId, initialStatus, startPolling, clearTimer, onTerminal]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    status,
    polling,
    error,
    pollOnce,
    startPolling,
    setStatus,
  };
}
