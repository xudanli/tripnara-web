import { useEffect, useRef, useState } from 'react';
import { decisionProblemsApi } from '@/api/decision-problems';
import type { OrtToolsEvaluateShadowAttachment } from '@/types/ortools-shadow';

export interface UseOrtToolsEvaluateShadowWarmupOptions {
  tripId: string;
  problemId: string | null | undefined;
  /** GET detail 顶层 data.ortoolsShadow（优先） */
  detailShadow?: OrtToolsEvaluateShadowAttachment | null;
  shadowRepairEnabled: boolean;
  /** detail 首轮已结算（非 loading） */
  detailReady: boolean;
  /** evaluate 后拉详情，写入 data.ortoolsShadow */
  onDetailStale?: () => void;
}

/**
 * 决策空间 Shadow 读法（后端对齐）：
 * 1) 优先 detail.ortoolsShadow
 * 2) 缺省且 Shadow 开启 → 对该 problem 调一次 evaluate，再刷新 detail
 */
export function useOrtToolsEvaluateShadowWarmup({
  tripId,
  problemId,
  detailShadow,
  shadowRepairEnabled,
  detailReady,
  onDetailStale,
}: UseOrtToolsEvaluateShadowWarmupOptions) {
  const [shadowFromEvaluate, setShadowFromEvaluate] =
    useState<OrtToolsEvaluateShadowAttachment | null>(null);
  const [warming, setWarming] = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());
  const onDetailStaleRef = useRef(onDetailStale);
  onDetailStaleRef.current = onDetailStale;

  useEffect(() => {
    setShadowFromEvaluate(null);
  }, [problemId]);

  useEffect(() => {
    if (!shadowRepairEnabled || !tripId || !problemId || !detailReady) return;
    if (detailShadow) return;
    if (attemptedRef.current.has(problemId)) return;
    attemptedRef.current.add(problemId);

    let cancelled = false;
    setWarming(true);

    void decisionProblemsApi
      .evaluateProblem(tripId, problemId)
      .then((result) => {
        if (cancelled) return;
        if (result.ortoolsShadow) {
          setShadowFromEvaluate(result.ortoolsShadow);
        }
        onDetailStaleRef.current?.();
      })
      .catch(() => {
        // Shadow 为旁路观测；evaluate 失败不阻断权威写路径
      })
      .finally(() => {
        if (!cancelled) setWarming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shadowRepairEnabled, tripId, problemId, detailReady, detailShadow]);

  return {
    ortoolsShadow: detailShadow ?? shadowFromEvaluate,
    warming,
  };
}
