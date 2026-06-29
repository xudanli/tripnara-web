import { useCallback, useEffect, useRef, useState } from 'react';
import { tripConstraintsApi, isTripConstraintsUnavailable } from '@/api/trip-constraints';
import type { TripConstraintsCheckResponse } from '@/types/trip-constraints';

export interface UseTripConstraintsCheckOptions {
  enabled?: boolean;
  /** 方案 revision / constraintsVersion 变更时重新 check */
  refreshKey?: number | string | null;
}

export interface UseTripConstraintsCheckResult {
  checkResult: TripConstraintsCheckResponse | null;
  checking: boolean;
  checkError: string | null;
  runCheck: () => Promise<TripConstraintsCheckResponse | null>;
  runRepair: (issueId?: string) => Promise<void>;
  repairing: boolean;
}

export function useTripConstraintsCheck(
  tripId: string | null | undefined,
  options?: UseTripConstraintsCheckOptions,
): UseTripConstraintsCheckResult {
  const enabled = options?.enabled !== false && Boolean(tripId);
  const [checkResult, setCheckResult] = useState<TripConstraintsCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runCheck = useCallback(async () => {
    if (!tripId) return null;
    setChecking(true);
    setCheckError(null);
    try {
      const result = await tripConstraintsApi.check(tripId);
      if (mountedRef.current) {
        setCheckResult(result);
      }
      return result;
    } catch (err) {
      if (isTripConstraintsUnavailable(err)) {
        if (mountedRef.current) {
          setCheckResult(null);
          setCheckError(null);
        }
        return null;
      }
      if (mountedRef.current) {
        setCheckError(err instanceof Error ? err.message : '冲突检测失败');
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }, [tripId]);

  const runRepair = useCallback(
    async (issueId?: string) => {
      if (!tripId) return;
      setRepairing(true);
      try {
        await tripConstraintsApi.repair(tripId, issueId ? { issueId } : undefined);
      } finally {
        if (mountedRef.current) {
          setRepairing(false);
        }
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (!enabled) return;
    void runCheck();
  }, [enabled, tripId, options?.refreshKey, runCheck]);

  return {
    checkResult,
    checking,
    checkError,
    runCheck,
    runRepair,
    repairing,
  };
}
