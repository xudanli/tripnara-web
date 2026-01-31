/**
 * 决策卡片网格组件（ToC Lite）
 * 用于预览阶段展示关键决策卡片网格
 */

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import KeyDecisionCard from './KeyDecisionCard';
import DecisionExplanationSheet from './DecisionExplanationSheet';
import { decisionDraftApi } from '@/api/decision-draft';
import type { DecisionDraft, DecisionStep, UserMode } from '@/types/decision-draft';
import { cn } from '@/lib/utils';

export interface DecisionCardsGridProps {
  draftId: string;
  userMode?: UserMode;
  className?: string;
}

export default function DecisionCardsGrid({ draftId, userMode = 'toc', className }: DecisionCardsGridProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (draftId) {
      loadDraft();
    }
  }, [draftId]);

  const loadDraft = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getDecisionDraft(draftId, userMode);
      setDraft(data);
    } catch (err: any) {
      setError(err.message || '加载决策草案失败');
      console.error('Failed to load draft:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (stepId: string) => {
    setSelectedStepId(stepId);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedStepId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="w-6 h-6" />
        <span className="ml-2 text-sm text-muted-foreground">加载决策信息中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!draft || !draft.decision_steps || draft.decision_steps.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">暂无决策信息</p>
        <p className="text-xs mt-1">决策草案可能尚未生成或为空</p>
      </div>
    );
  }

  // 筛选关键决策（置信度 > 0.7 或 is_key 为 true）
  const keySteps = draft.decision_steps.filter(
    (step) => step.is_key || step.confidence > 0.7
  ).slice(0, 7); // 最多显示7个

  if (keySteps.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">暂无关键决策</p>
        <p className="text-xs mt-1">所有决策的置信度都较低</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {keySteps.map((step) => (
          <KeyDecisionCard
            key={step.id}
            step={step}
            onClick={() => handleCardClick(step.id)}
          />
        ))}
      </div>

      {/* 决策解释抽屉 */}
      {selectedStepId && (
        <DecisionExplanationSheet
          draftId={draftId}
          stepId={selectedStepId}
          userMode={userMode}
          open={sheetOpen}
          onClose={handleSheetClose}
        />
      )}
    </>
  );
}
