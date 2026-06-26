import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GuardianChooseModal } from '@/components/guardian/GuardianChooseModal';
import { GuardianPresentationPanel } from '@/components/guardian/GuardianPresentationPanel';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';
import {
  canShowGuardianChoose,
  extractChooseOptions,
  isHardConstraintBlock,
} from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import { HelpCircle } from 'lucide-react';

export interface FeasibilityRepairDeferredChooseProps {
  tripId: string;
  userId?: string | null;
  issueId: string;
  optionId?: string | null;
  choosePoints: string[];
  presentation?: GuardianPersonaPresentation | null;
  /** 展示 deferred 说明文案 */
  message?: string;
  onPresentationChange?: (presentation: GuardianPersonaPresentation) => void;
  /** CHOOSE 后建议重试 apply（nextAction=APPLY_REPAIR） */
  onRetryApply?: () => void;
}

/**
 * Readiness / feasibility repair deferred：humanDecisionPointsFlat + CHOOSE 写回。
 */
export function FeasibilityRepairDeferredChoose({
  tripId,
  userId,
  issueId,
  optionId,
  choosePoints: choosePointsProp,
  presentation: presentationProp,
  message,
  onPresentationChange,
  onRetryApply,
}: FeasibilityRepairDeferredChooseProps) {
  const [chooseOpen, setChooseOpen] = useState(false);
  const [activePresentation, setActivePresentation] = useState(
    presentationProp ?? undefined,
  );
  const [choosePoints, setChoosePoints] = useState(choosePointsProp);

  useEffect(() => {
    setChoosePoints(choosePointsProp);
  }, [choosePointsProp]);

  useEffect(() => {
    setActivePresentation(presentationProp ?? undefined);
  }, [presentationProp]);

  const options = useMemo(
    () =>
      extractChooseOptions({
        presentation: activePresentation,
        humanDecisionPointsFlat: choosePoints,
      }),
    [activePresentation, choosePoints],
  );

  const hardBlocked = activePresentation
    ? isHardConstraintBlock(activePresentation)
    : false;

  const showChoose = canShowGuardianChoose({
    presentation: activePresentation,
    decision: 'NEEDS_HUMAN',
    hardConstraintBlocked: hardBlocked,
    chooseOptions: options,
  });

  const correlationId =
    optionId != null ? `${issueId}:${optionId}:readiness_repair` : `${issueId}:readiness_repair`;

  const { submitChoice, isSubmitting } = useGuardianHumanChoice({
    userId,
    tripId,
    source: 'readiness_repair',
    correlationId,
    decisionPoints: options,
    onPresentation: (next) => {
      setActivePresentation(next);
      const refreshed = extractChooseOptions({ presentation: next });
      if (refreshed.length > 0) setChoosePoints(refreshed);
      onPresentationChange?.(next);
    },
    onNextAction: (action) => {
      if (action === 'APPLY_REPAIR' || action === 'CONTINUE_PLANNING') {
        onRetryApply?.();
      }
    },
  });

  if (!showChoose && !activePresentation) {
    return message ? (
      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
    ) : null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
      {message ? (
        <p className="text-xs text-amber-950 leading-relaxed">{message}</p>
      ) : null}
      {activePresentation ? (
        <GuardianPresentationPanel presentation={activePresentation} />
      ) : null}
      {showChoose ? (
        <>
          <Button
            size="sm"
            variant="default"
            disabled={isSubmitting}
            onClick={() => setChooseOpen(true)}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            完成修复前取舍
          </Button>
          <GuardianChooseModal
            open={chooseOpen}
            onOpenChange={setChooseOpen}
            points={options}
            title="准备度修复 — 需要您选择"
            description="以下为软约束取舍，确认后可继续应用修复。"
            onConfirm={(idx, text) => {
              void submitChoice(idx, text, options);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
