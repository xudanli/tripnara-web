import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decisionSpaceBundleApi,
  isDecisionSpaceBundleRecoverableError,
} from '@/api/decision-space-bundle';
import type { SharedDecisionInspectorQuery } from '@/components/plan-studio/workbench/arrange-itinerary/decision-inspector-shared.types';
import { useDecisionInspector } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionInspector';
import {
  DECISION_PROBLEM_DETAIL_STALE_MS,
  decisionProblemsQueryErrorMessage,
  decisionProblemsQueryKeys,
} from '@/hooks/decision-problems-query.util';
import { deriveDecisionSpaceContentFromDetail } from '@/lib/decision-space-detail-content.util';
import {
  DECISION_SPACE_BUNDLE_TIER2_EXCLUDE,
  decisionSpaceBundleQueryKeys,
  isDecisionSpaceBundleEnabled,
  resolveDecisionSpaceBundleSurface,
} from '@/lib/decision-space-bundle.util';
import { useDecisionBasis } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionBasis';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';
import { decisionProblemsApi } from '@/api/decision-problems';
import type { DecisionProblemDetail } from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import type { DecisionSpaceBundle } from '@/dto/frontend-decision-space-bundle.types';
import type { PlanningDecisionBasis } from '@/dto/frontend-planning-decision-basis.types';
import type { PlanningDecisionInspector } from '@/dto/frontend-planning-decision-inspector.types';

export interface UseDecisionSpaceTier2Options {
  tripId: string;
  problemId: string | null | undefined;
  proposalId?: string | null;
  focusConflictId?: string | null;
  optionId?: string | null;
  enabled?: boolean;
}

export interface DecisionSpaceTier2BffContent {
  detail: GatewayDecisionProblemDetailResult | DecisionProblemDetail | null;
  options: ReturnType<typeof deriveDecisionSpaceContentFromDetail>['options'];
  optionsActions: ReturnType<typeof deriveDecisionSpaceContentFromDetail>['optionsActions'];
  comparisonView: ReturnType<typeof deriveDecisionSpaceContentFromDetail>['comparisonView'];
  /** bundle.pack.options — 中栏方案卡 SSOT，不必等 plan-proposal 独立 GET */
  packOptions: PlanningDecisionPackOption[];
  detailLoading: boolean;
  optionsLoading: boolean;
  /** 仅 problem / pack 首包；不含 basis / inspector Tab 增量 */
  loading: boolean;
  basisLoading: boolean;
  error: string | null;
  reload: () => void;
}

export interface UseDecisionSpaceTier2Result {
  source: 'bundle' | 'legacy' | null;
  bffContent: DecisionSpaceTier2BffContent;
  sharedInspector: SharedDecisionInspectorQuery | undefined;
  inspectorBasis: PlanningDecisionBasis | null | undefined;
  bundle: DecisionSpaceBundle | null;
  bundleEtag: string | null;
}

function resolveInspectorFromBundle(
  bundle: DecisionSpaceBundle | null | undefined,
): PlanningDecisionInspector | undefined {
  if (!bundle) return undefined;
  const tabEmptyState = {
    ...bundle.inspector?.tabEmptyState,
    ...bundle.meta?.tabEmptyState,
  };
  if (bundle.inspector) {
    return {
      ...bundle.inspector,
      tabEmptyState: Object.keys(tabEmptyState).length ? tabEmptyState : bundle.inspector.tabEmptyState,
    };
  }
  if (bundle.basis) {
    return {
      schema: 'tripnara.planning_decision_inspector@v1',
      mode: bundle.binding.mode === 'proposal' ? 'proposal' : 'problem',
      decisionBasis: bundle.basis,
      tabEmptyState: Object.keys(tabEmptyState).length ? tabEmptyState : undefined,
    } as PlanningDecisionInspector;
  }
  return undefined;
}

/**
 * Tier-2 决策空间读路径（Phase 1 双读）
 * - bundle 成功 → 1 次 GET（exclude basis）替代 detail + inspector；basis 异步 decision-basis
 * - bundle 404/501 → 回退 decision-problems/:id ∥ decision-inspector?problemId
 */
export function useDecisionSpaceTier2({
  tripId,
  problemId,
  proposalId,
  focusConflictId,
  optionId,
  enabled = true,
}: UseDecisionSpaceTier2Options): UseDecisionSpaceTier2Result {
  const queryClient = useQueryClient();
  const bundleFlag = isDecisionSpaceBundleEnabled();
  const active = enabled && Boolean(problemId || proposalId);
  const resolvedProblemId = problemId ?? '';
  const bundleSurface = resolveDecisionSpaceBundleSurface(optionId);

  const bundleQuery = useQuery({
    queryKey: decisionSpaceBundleQueryKeys.tier2(tripId, {
      problemId,
      proposalId,
      conflictId: focusConflictId,
      optionId,
      surface: bundleSurface,
    }),
    queryFn: async ({ signal }) => {
      const result = await decisionSpaceBundleApi.getBundle(
        tripId,
        {
          problemId,
          proposalId,
          conflictId: focusConflictId,
          optionId,
          surface: bundleSurface,
          exclude: DECISION_SPACE_BUNDLE_TIER2_EXCLUDE,
        },
        { signal },
      );
      if (result.status === 'not_modified') {
        const cached = queryClient.getQueryData<DecisionSpaceBundle>(
          decisionSpaceBundleQueryKeys.tier2(tripId, {
            problemId,
            proposalId,
            conflictId: focusConflictId,
            optionId,
            surface: bundleSurface,
          }),
        );
        if (cached) return cached;
        throw new Error('decision-space-bundle 304 without cached payload');
      }
      return result.data;
    },
    enabled: bundleFlag && active,
    staleTime: DECISION_PROBLEM_DETAIL_STALE_MS,
    retry: (failureCount, error) =>
      !isDecisionSpaceBundleRecoverableError(error) && failureCount < 1,
  });

  const bundleRecoverableFailure =
    bundleFlag &&
    active &&
    bundleQuery.isError &&
    isDecisionSpaceBundleRecoverableError(bundleQuery.error);

  const useLegacyPath =
    active &&
    (!bundleFlag || bundleRecoverableFailure || (bundleQuery.isError && !bundleQuery.isLoading));

  const legacyDetailQuery = useQuery({
    queryKey: decisionProblemsQueryKeys.detail(tripId, resolvedProblemId, focusConflictId),
    queryFn: ({ signal }) =>
      decisionProblemsApi.getProblem(tripId, resolvedProblemId, {
        focusConflictId,
        signal,
      }),
    enabled: useLegacyPath && Boolean(problemId) && !bundleQuery.isSuccess,
    staleTime: DECISION_PROBLEM_DETAIL_STALE_MS,
  });

  const legacyInspectorEnabled =
    useLegacyPath && Boolean(problemId || proposalId) && !bundleQuery.isSuccess;

  const legacyInspectorQuery = useDecisionInspector(
    tripId,
    {
      proposalId,
      problemId,
      optionId,
      conflictId: focusConflictId,
    },
    legacyInspectorEnabled,
  );

  const bundle = bundleQuery.isSuccess ? (bundleQuery.data ?? null) : null;
  const source: UseDecisionSpaceTier2Result['source'] = !active
    ? null
    : bundle
      ? 'bundle'
      : bundleFlag && bundleQuery.isLoading
        ? null
        : 'legacy';

  const detail: GatewayDecisionProblemDetailResult | DecisionProblemDetail | null =
    bundle?.problem ?? (useLegacyPath || !bundleFlag ? (legacyDetailQuery.data ?? null) : null);

  const derived = useMemo(() => deriveDecisionSpaceContentFromDetail(detail), [detail]);

  const inspectorData =
    resolveInspectorFromBundle(bundle) ??
    (useLegacyPath || !bundleFlag ? legacyInspectorQuery.data : undefined);

  const detailLoading =
    active &&
    (bundleFlag
      ? bundleQuery.isLoading || (bundleRecoverableFailure && legacyDetailQuery.isLoading)
      : legacyDetailQuery.isLoading);

  const inspectorLoading =
    active &&
    (bundleFlag
      ? bundleQuery.isLoading ||
        (bundleRecoverableFailure && legacyInspectorQuery.isLoading)
      : legacyInspectorQuery.isLoading);

  const shouldFetchDeferredBasis =
    bundleFlag &&
    active &&
    bundleQuery.isSuccess &&
    !bundle?.basis &&
    !bundleRecoverableFailure;

  const deferredBasisQuery = useDecisionBasis(
    tripId,
    { conflictId: focusConflictId, proposalId },
    shouldFetchDeferredBasis,
  );

  const basisLoading =
    active &&
    (shouldFetchDeferredBasis
      ? deferredBasisQuery.isLoading
      : !bundleFlag && legacyInspectorQuery.isLoading && !inspectorData?.decisionBasis);

  const detailError = legacyDetailQuery.error
    ? decisionProblemsQueryErrorMessage(legacyDetailQuery.error, '加载决策详情失败')
    : null;
  const bundleError =
    bundleQuery.error && !isDecisionSpaceBundleRecoverableError(bundleQuery.error)
      ? decisionProblemsQueryErrorMessage(bundleQuery.error, '加载决策空间 Bundle 失败')
      : null;

  const reload = useCallback(() => {
    if (bundleFlag) {
      void queryClient.invalidateQueries({
        queryKey: decisionSpaceBundleQueryKeys.tier2(tripId, {
          problemId,
          proposalId,
          conflictId: focusConflictId,
          optionId,
          surface: bundleSurface,
        }),
      });
    }
    if (shouldFetchDeferredBasis) {
      void deferredBasisQuery.refetch();
    }
    if (!bundleFlag || bundleRecoverableFailure || bundleQuery.isError) {
      if (problemId) {
        void queryClient.invalidateQueries({
          queryKey: decisionProblemsQueryKeys.detail(tripId, problemId, focusConflictId),
        });
      }
      void legacyInspectorQuery.refetch();
    }
  }, [
    shouldFetchDeferredBasis,
    deferredBasisQuery,
    bundleFlag,
    bundleRecoverableFailure,
    bundleQuery.isError,
    bundleSurface,
    focusConflictId,
    legacyInspectorQuery,
    optionId,
    problemId,
    proposalId,
    queryClient,
    tripId,
  ]);

  const sharedInspector = useMemo<SharedDecisionInspectorQuery | undefined>(
    () =>
      active
        ? {
            data: inspectorData,
            isLoading: inspectorLoading,
            isFetching: bundleFlag
              ? bundleQuery.isFetching || legacyInspectorQuery.isFetching
              : legacyInspectorQuery.isFetching,
            isError: bundleFlag
              ? bundleQuery.isError && !isDecisionSpaceBundleRecoverableError(bundleQuery.error)
              : legacyInspectorQuery.isError,
            refetch: reload,
          }
        : undefined,
    [
      active,
      inspectorData,
      inspectorLoading,
      bundleFlag,
      bundleQuery.isFetching,
      bundleQuery.isError,
      bundleQuery.error,
      legacyInspectorQuery.isFetching,
      legacyInspectorQuery.isError,
      reload,
    ],
  );

  const inspectorBasis = basisLoading
    ? undefined
    : bundle?.basis ??
      deferredBasisQuery.data ??
      inspectorData?.decisionBasis ??
      null;

  const packOptions = bundle?.pack?.options ?? [];

  const bffContent = useMemo(
    (): DecisionSpaceTier2BffContent => ({
      detail: active ? detail : null,
      options: active ? derived.options : [],
      optionsActions: active ? derived.optionsActions : [],
      comparisonView: active ? derived.comparisonView : null,
      packOptions: active ? packOptions : [],
      detailLoading,
      optionsLoading: false,
      loading: detailLoading,
      basisLoading,
      error: bundleError ?? detailError,
      reload,
    }),
    [
      active,
      detail,
      derived.options,
      derived.optionsActions,
      derived.comparisonView,
      packOptions,
      detailLoading,
      basisLoading,
      bundleError,
      detailError,
      reload,
    ],
  );

  return {
    source,
    bffContent,
    sharedInspector,
    inspectorBasis,
    bundle,
    bundleEtag: bundle?.etag ?? null,
  };
}
