/**
 * useDecisionDraft Hook
 * 统一管理决策草案的状态和操作
 */

import { useState, useEffect, useCallback } from 'react';
import { decisionDraftApi } from '@/api/decision-draft';
import type {
  DecisionDraft,
  DecisionStep,
  ImpactPreviewResult,
  UpdateDecisionStepRequest,
  PreviewImpactRequest,
  UserMode,
} from '@/types/decision-draft';
import { toast } from 'sonner';

export interface UseDecisionDraftOptions {
  draftId: string;
  userMode?: UserMode;
  autoLoad?: boolean;
}

export interface UseDecisionDraftReturn {
  // 状态
  draft: DecisionDraft | null;
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  
  // 操作
  loadDraft: () => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  updateStep: (stepId: string, updates: UpdateDecisionStepRequest) => Promise<DecisionStep | null>;
  previewImpact: (stepId: string, newValue: any) => Promise<ImpactPreviewResult | null>;
  refresh: () => Promise<void>;
}

export function useDecisionDraft({
  draftId,
  userMode = 'toc',
  autoLoad = true,
}: UseDecisionDraftOptions): UseDecisionDraftReturn {
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 加载决策草案
  const loadDraft = useCallback(async () => {
    if (!draftId) {
      setError('决策草案ID不能为空');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getDecisionDraft(draftId);
      setDraft(data);
    } catch (err: any) {
      const errorMessage = err.message || '加载决策草案失败';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to load decision draft:', err);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && draftId) {
      loadDraft();
    }
  }, [autoLoad, draftId, loadDraft]);

  // 选择节点
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // 更新步骤
  const updateStep = useCallback(
    async (stepId: string, updates: UpdateDecisionStepRequest): Promise<DecisionStep | null> => {
      if (!draftId) {
        toast.error('决策草案ID不能为空');
        return null;
      }

      try {
        const updatedStep = await decisionDraftApi.updateStep(draftId, stepId, updates);
        
        // 更新本地状态
        setDraft((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            decision_steps: prev.decision_steps.map((step) =>
              step.id === stepId ? updatedStep : step
            ),
          };
        });

        toast.success('决策步骤更新成功');
        return updatedStep;
      } catch (err: any) {
        const errorMessage = err.message || '更新决策步骤失败';
        toast.error(errorMessage);
        console.error('Failed to update step:', err);
        return null;
      }
    },
    [draftId]
  );

  // 预览影响
  const previewImpact = useCallback(
    async (stepId: string, newValue: any): Promise<ImpactPreviewResult | null> => {
      if (!draftId) {
        toast.error('决策草案ID不能为空');
        return null;
      }

      try {
        const impact = await decisionDraftApi.previewImpact(draftId, {
          step_id: stepId,
          new_value: newValue,
        });
        return impact;
      } catch (err: any) {
        const errorMessage = err.message || '预览影响失败';
        toast.error(errorMessage);
        console.error('Failed to preview impact:', err);
        return null;
      }
    },
    [draftId]
  );

  // 刷新
  const refresh = useCallback(async () => {
    await loadDraft();
  }, [loadDraft]);

  return {
    draft,
    loading,
    error,
    selectedNodeId,
    loadDraft,
    selectNode,
    updateStep,
    previewImpact,
    refresh,
  };
}
