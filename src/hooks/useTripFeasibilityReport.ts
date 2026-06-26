import { useCallback, useEffect, useState } from 'react';
import { tripConstraintSolverApi } from '@/api/trip-constraint-solver';
import type { TripFeasibilityReportDto, FeasibilityReportValidateOptions } from '@/types/trip-feasibility-report';

function sanitizeValidateOptions(
  options?: FeasibilityReportValidateOptions | unknown,
): FeasibilityReportValidateOptions | undefined {
  if (!options || typeof options !== 'object') return undefined;
  // React 误把 click event 传进来时忽略
  if ('nativeEvent' in options || 'preventDefault' in options) return undefined;
  const o = options as FeasibilityReportValidateOptions;
  const next: FeasibilityReportValidateOptions = {};
  if (o.forceRefreshEvidence) next.forceRefreshEvidence = true;
  if (o.runMonteCarlo) next.runMonteCarlo = true;
  if (o.monteCarloSampleSize != null) next.monteCarloSampleSize = o.monteCarloSampleSize;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function useTripFeasibilityReport(tripId: string | null | undefined, enabled = true) {
  const [data, setData] = useState<TripFeasibilityReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const report = await tripConstraintSolverApi.getFeasibilityReport(tripId);
      setData(report);
    } catch (e) {
      console.error('[useTripFeasibilityReport]', e);
      setData(null);
      setError(e instanceof Error ? e.message : '加载可执行性报告失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  const revalidateFull = useCallback(async (options?: FeasibilityReportValidateOptions) => {
    if (!tripId) return null;
    const body = sanitizeValidateOptions(options);
    try {
      setError(null);
      const report = await tripConstraintSolverApi.revalidateFullTrip(tripId, body);
      setData(report);
      return report;
    } catch (e) {
      const message = e instanceof Error ? e.message : '重新验证失败';
      setError(message);
      console.error('[useTripFeasibilityReport] revalidateFull', e);
      return null;
    }
  }, [tripId]);

  const revalidateScope = useCallback(
    async (scope: { dayNumber?: number; issueId?: string; segmentId?: string }) => {
      if (!tripId) return null;
      try {
        const report = await tripConstraintSolverApi.revalidateScope(tripId, scope);
        setData(report);
        return report;
      } catch (e) {
        setError(e instanceof Error ? e.message : '局部验证失败');
        return null;
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { data, loading, error, reload, revalidateFull, revalidateScope };
}
