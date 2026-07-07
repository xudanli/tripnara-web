import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateWorkbenchAfterConstraintChange,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { travelStatusQueryKeys } from '@/hooks/useTravelStatus';

export interface UseConstraintEditSessionOptions {
  tripId: string | null | undefined;
  queryClient: QueryClient;
  /** 任一约束编辑 UI 打开：三栏控制台 / 添加弹窗 / 单条编辑弹窗 */
  sessionUiActive: boolean;
  onAfterCommit?: () => void | Promise<void>;
}

export interface ConstraintEditSessionController {
  saveCount: number;
  evalPending: boolean;
  sessionUiActive: boolean;
  /** 约束 SSOT 已写入；会话内延迟重算 */
  notifyConstraintSaved: () => void;
  /** 立即触发一次合并评估 */
  commitEval: () => Promise<void>;
  /** 放弃待评估（直接关闭时用户选「不重算」） */
  dismissPendingEval: () => void;
}

export function useConstraintEditSession({
  tripId,
  queryClient,
  sessionUiActive,
  onAfterCommit,
}: UseConstraintEditSessionOptions): ConstraintEditSessionController {
  const [saveCount, setSaveCount] = useState(0);
  const [evalPending, setEvalPending] = useState(false);
  const committingRef = useRef(false);
  const evalPendingRef = useRef(false);
  const sessionUiActiveRef = useRef(sessionUiActive);

  useEffect(() => {
    evalPendingRef.current = evalPending;
  }, [evalPending]);

  useEffect(() => {
    sessionUiActiveRef.current = sessionUiActive;
  }, [sessionUiActive]);

  const flushEval = useCallback(async () => {
    if (!tripId || committingRef.current) return;
    committingRef.current = true;
    try {
      await invalidateWorkbenchAfterConstraintChange(queryClient, tripId, {
        skipConstraintsList: true,
      });
      await queryClient.invalidateQueries({ queryKey: travelStatusQueryKeys.status(tripId) });
      await onAfterCommit?.();
      setEvalPending(false);
      setSaveCount(0);
    } finally {
      committingRef.current = false;
    }
  }, [tripId, queryClient, onAfterCommit]);

  const commitEval = useCallback(async () => {
    if (!evalPendingRef.current) return;
    await flushEval();
  }, [flushEval]);

  const dismissPendingEval = useCallback(() => {
    setEvalPending(false);
    setSaveCount(0);
  }, []);

  const notifyConstraintSaved = useCallback(() => {
    if (sessionUiActiveRef.current) {
      setSaveCount((count) => count + 1);
      setEvalPending(true);
      return;
    }
    void flushEval();
  }, [flushEval]);

  // 会话关闭时不自动重算；由用户点击「保存并评估」或关闭确认框触发

  return {
    saveCount,
    evalPending,
    sessionUiActive,
    notifyConstraintSaved,
    commitEval,
    dismissPendingEval,
  };
}
