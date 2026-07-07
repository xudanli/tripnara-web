/** React Query keys + fetchers for trip-scoped decision-problems BFF */

import type { QueryClient } from '@tanstack/react-query';
import {
  DecisionSemanticsApiError,
  decisionProblemsApi,
} from '@/api/decision-problems';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import { mergeDecisionCenterOverviewV2 } from '@/lib/decision-center-overview-v2.util';
import type { DecisionCenterOverview, DecisionProblemSummary } from '@/types/decision-problem';
import { compareDecisionProblemsForQueue } from '@/lib/decision-problem-queue-display.util';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import type {
  UnifiedDecisionCenterView,
  UnifiedDecisionProblemListMeta,
} from '@/types/unified-decision';

/** 与后端 Collector 短缓存对齐（写路径 invalidate 后 10s 内可接受 stale） */
export const DECISION_PROBLEMS_STALE_MS = 10_000;

/** detail 读路径：切换 problem 时少重复拉取；写路径仍会 invalidate */
export const DECISION_PROBLEM_DETAIL_STALE_MS = 30_000;

/** BFF 读路径超时（preview/apply 仍用全局 60s） */
export const DECISION_PROBLEMS_READ_TIMEOUT_MS = 15_000;

export const decisionProblemsQueryKeys = {
  list: (tripId: string) => ['trips', tripId, 'decision-problems'] as const,
  center: (tripId: string) => ['trips', tripId, 'decision-center'] as const,
  centerUnified: (tripId: string) => ['trips', tripId, 'decision-center', 'unified'] as const,
  detail: (
    tripId: string,
    problemId: string,
    focusConflictId?: string | null,
  ) =>
    [
      'trips',
      tripId,
      'decision-problems',
      problemId,
      { focus: focusConflictId ?? null },
    ] as const,
  options: (tripId: string, problemId: string) =>
    ['trips', tripId, 'decision-problems', problemId, 'options'] as const,
};

export interface DecisionProblemsListQueryData {
  items: DecisionProblemSummary[];
  listMeta: UnifiedDecisionProblemListMeta | null;
  useLegacy: boolean;
}

export async function fetchDecisionProblemsList(
  tripId: string,
): Promise<DecisionProblemsListQueryData> {
  if (isUnifiedDecisionGatewayEnabled()) {
    const { meta, items } = await decisionProblemsApi.listUnifiedByTrip(tripId);
    return { items, listMeta: meta, useLegacy: false };
  }

  try {
    const { items } = await decisionProblemsApi.listByTrip(tripId);
    return { items, listMeta: null, useLegacy: false };
  } catch (err) {
    if (decisionProblemsApi.isNotImplemented(err)) {
      return { items: [], listMeta: null, useLegacy: true };
    }
    throw err;
  }
}

export interface DecisionCenterOverviewQueryData {
  overview: DecisionCenterOverview | null;
  useLegacy: boolean;
  unifiedView: UnifiedDecisionCenterView | null;
}

export interface FetchDecisionCenterOverviewOptions {
  /** true 时额外拉 GET /decision-center（冷启动慢，仅 Tasks Tab / activePacks 需要） */
  includeUnifiedGateway?: boolean;
}

export async function fetchDecisionCenterOverview(
  tripId: string,
  options: FetchDecisionCenterOverviewOptions = {},
): Promise<DecisionCenterOverviewQueryData> {
  const includeUnifiedGateway = options.includeUnifiedGateway === true;

  if (isUnifiedDecisionGatewayEnabled()) {
    let unifiedView: UnifiedDecisionCenterView | null = null;
    if (includeUnifiedGateway) {
      unifiedView = await decisionProblemsApi.getUnifiedDecisionCenter(tripId);
      if (unifiedView.legacy || unifiedView.overview) {
        return {
          overview: mergeDecisionCenterOverviewV2(unifiedView.legacy, unifiedView.overview, {
            problemCount: unifiedView.problemCount,
          }),
          useLegacy: false,
          unifiedView,
        };
      }
    }

    try {
      const data = await decisionProblemsApi.getCenterOverview(tripId);
      return {
        overview: includeUnifiedGateway && unifiedView
          ? mergeDecisionCenterOverviewV2(unifiedView.legacy, data, {
              problemCount: unifiedView.problemCount,
            })
          : data,
        useLegacy: false,
        unifiedView: includeUnifiedGateway ? unifiedView : null,
      };
    } catch (overviewErr) {
      if (!decisionProblemsApi.isNotImplemented(overviewErr)) throw overviewErr;
    }

    return { overview: null, useLegacy: false, unifiedView: includeUnifiedGateway ? unifiedView : null };
  }

  try {
    const data = await decisionProblemsApi.getCenterOverview(tripId);
    return { overview: data, useLegacy: false, unifiedView: null };
  } catch (err) {
    if (decisionProblemsApi.isNotImplemented(err)) {
      return { overview: null, useLegacy: true, unifiedView: null };
    }
    throw err;
  }
}

export function decisionProblemsQueryErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof DecisionSemanticsApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function fetchDecisionProblemDetail(
  tripId: string,
  problemId: string,
  focusConflictId?: string | null,
  signal?: AbortSignal,
): Promise<GatewayDecisionProblemDetailResult> {
  return decisionProblemsApi.getProblem(tripId, problemId, {
    focusConflictId: focusConflictId ?? undefined,
    signal,
  });
}

/** 队列 hover 预取 detail，点击后命中 React Query 缓存 */
export function prefetchDecisionProblemDetail(
  queryClient: QueryClient,
  tripId: string,
  problemId: string,
  focusConflictId?: string | null,
): Promise<void> {
  return queryClient
    .prefetchQuery({
      queryKey: decisionProblemsQueryKeys.detail(tripId, problemId, focusConflictId),
      queryFn: ({ signal }) => fetchDecisionProblemDetail(tripId, problemId, focusConflictId, signal),
      staleTime: DECISION_PROBLEM_DETAIL_STALE_MS,
    })
    .then(() => undefined);
}

const DEFAULT_OPEN_PROBLEM_PREFETCH_LIMIT = 2;

/** 按队列排序取前 N 个 open problem，用于 schedule Tab 空闲预取 */
export function pickDecisionProblemsForDetailPrefetch(
  items: DecisionProblemSummary[],
  limit = DEFAULT_OPEN_PROBLEM_PREFETCH_LIMIT,
): DecisionProblemSummary[] {
  return [...items]
    .filter((item) => item.status !== 'RESOLVED' && item.status !== 'DISMISSED')
    .sort(compareDecisionProblemsForQueue)
    .slice(0, Math.max(0, limit));
}

/** schedule 工作台：空闲时预取队列头部 open problems 的 detail */
export function prefetchOpenDecisionProblemDetails(
  queryClient: QueryClient,
  tripId: string,
  items: DecisionProblemSummary[],
  focusConflictId?: string | null,
  limit = DEFAULT_OPEN_PROBLEM_PREFETCH_LIMIT,
): void {
  for (const problem of pickDecisionProblemsForDetailPrefetch(items, limit)) {
    void prefetchDecisionProblemDetail(queryClient, tripId, problem.id, focusConflictId);
  }
}
