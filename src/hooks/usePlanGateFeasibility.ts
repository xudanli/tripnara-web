import { useCallback, useEffect, useMemo, useState } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { PlanGateFeasibilityResponse, PlanGateVerificationMetrics } from '@/types/plan-gate';

export interface UsePlanGateFeasibilityOptions {
  tripId: string;
  planId?: string | null;
  /** execute 内嵌 metrics（verification / draftDiff） */
  embeddedMetrics?: PlanGateVerificationMetrics | null;
  /** planState.metadata.executabilityScore */
  metadataScore?: number | null;
  enabled?: boolean;
}

export function readPlanStateExecutabilityScore(planState: unknown): number | undefined {
  if (!planState || typeof planState !== 'object') return undefined;
  const metadata = (planState as { metadata?: Record<string, unknown> }).metadata;
  if (!metadata) return undefined;
  const score = metadata.executabilityScore ?? metadata.executability_score;
  return typeof score === 'number' && Number.isFinite(score) ? score : undefined;
}

export function resolvePlanGateExecutabilityMetrics(
  embeddedMetrics?: PlanGateVerificationMetrics | null,
  feasibility?: PlanGateFeasibilityResponse | null,
  metadataScore?: number | null,
): PlanGateVerificationMetrics | undefined {
  const executability =
    embeddedMetrics?.executability ??
    feasibility?.draftScore ??
    metadataScore ??
    undefined;

  const executabilityDelta =
    embeddedMetrics?.executabilityDelta ??
    feasibility?.executabilityDelta ??
    (feasibility?.baselineScore != null && feasibility?.draftScore != null
      ? feasibility.draftScore - feasibility.baselineScore
      : undefined);

  if (executability == null && executabilityDelta == null && !embeddedMetrics) {
    return undefined;
  }

  return {
    ...embeddedMetrics,
    executability,
    executabilityDelta,
  };
}

export function usePlanGateFeasibility({
  tripId,
  planId,
  embeddedMetrics,
  metadataScore,
  enabled = true,
}: UsePlanGateFeasibilityOptions) {
  const [remote, setRemote] = useState<PlanGateFeasibilityResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const needsFetch =
    enabled &&
    Boolean(tripId) &&
    embeddedMetrics?.executability == null &&
    metadataScore == null;

  const refresh = useCallback(async () => {
    if (!tripId) return null;
    setLoading(true);
    try {
      const data = await planningWorkbenchApi.getPlanGateFeasibility(
        tripId,
        planId ?? undefined,
      );
      setRemote(data);
      return data;
    } catch (err) {
      console.warn('[Plan Gate] feasibility load failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [planId, tripId]);

  useEffect(() => {
    if (!needsFetch) return;
    void refresh();
  }, [needsFetch, refresh]);

  const metrics = useMemo(
    () => resolvePlanGateExecutabilityMetrics(embeddedMetrics, remote, metadataScore),
    [embeddedMetrics, metadataScore, remote],
  );

  return {
    feasibility: remote,
    metrics,
    loading: needsFetch && loading,
    refresh,
  };
}

export function hasPlanGateSplitMeetupBlocker(blockers?: string[]): boolean {
  if (!blockers?.length) return false;
  return blockers.some(
    (item) =>
      item.includes('汇合点') ||
      item.includes('分流') && item.includes('缺少'),
  );
}
