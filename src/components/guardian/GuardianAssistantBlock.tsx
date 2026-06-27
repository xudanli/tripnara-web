import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GuardianPresentationPanel } from '@/components/guardian/GuardianPresentationPanel';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';
import {
  extractChooseOptions,
  isHardConstraintBlock,
} from '@/lib/guardian-presentation.util';
import type { GuardianHumanChoiceSource } from '@/types/guardian-choose';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import { cn } from '@/lib/utils';

export interface GuardianAssistantBlockProps {
  presentation: GuardianPersonaPresentation;
  tripId?: string | null;
  userId?: string | null;
  source?: GuardianHumanChoiceSource;
  choosePoints?: string[];
  sessionId?: string | null;
  correlationId?: string | null;
  className?: string;
  onPresentationChange?: (presentation: GuardianPersonaPresentation) => void;
  onChooseSuccess?: (selectedIndex: number, selectedText: string) => void;
  onNextAction?: (action: import('@/types/guardian-choose').GuardianChooseNextAction) => void;
  /** CHOOSE 成功后自动重新 execute(generate) */
  onRegenerate?: () => void | Promise<void>;
}

/**
 * 对话/助手场景的统一 Guardian 表达块：单主角 presentation + CHOOSE 写回。
 * CHOOSE 成功后用响应 presentation 刷新 UI，不再依赖旧选项列表。
 */
export function GuardianAssistantBlock({
  presentation,
  tripId,
  userId,
  source = 'presentation',
  choosePoints,
  sessionId,
  correlationId,
  className,
  onPresentationChange,
  onChooseSuccess,
  onNextAction,
  onRegenerate,
}: GuardianAssistantBlockProps) {
  const [activePresentation, setActivePresentation] = useState(presentation);

  useEffect(() => {
    setActivePresentation(presentation);
  }, [presentation]);

  const chooseOptions = useMemo(
    () =>
      extractChooseOptions({
        presentation: activePresentation,
        humanDecisionPointsFlat: choosePoints,
      }),
    [activePresentation, choosePoints],
  );

  const handlePresentation = (next: GuardianPersonaPresentation) => {
    setActivePresentation(next);
    onPresentationChange?.(next);
  };

  const hardBlocked = isHardConstraintBlock(activePresentation);
  const pointsForModal = hardBlocked || chooseOptions.length === 0 ? undefined : chooseOptions;

  const { submitChoice } = useGuardianHumanChoice({
    userId,
    tripId,
    source,
    sessionId,
    correlationId,
    decisionPoints: chooseOptions,
    onPresentation: handlePresentation,
    onSuccess: onChooseSuccess,
    onNextAction,
    onChooseResult: (chooseResult) => {
      if (chooseResult.nextAction === 'BLOCKED') return;
      if (
        !chooseResult.nextAction ||
        chooseResult.nextAction === 'CONTINUE_PLANNING' ||
        chooseResult.nextAction === 'RE_RUN_NEGOTIATION' ||
        chooseResult.nextAction === 'APPLY_REPAIR'
      ) {
        void onRegenerate?.();
      }
    },
  });

  return (
    <GuardianPresentationPanel
      presentation={activePresentation}
      className={className}
      choosePoints={pointsForModal}
      onChooseConfirm={hardBlocked ? undefined : submitChoice}
    />
  );
}

export interface GuardianLegacyCitationsProps {
  presentation?: GuardianPersonaPresentation | null;
  citations?: Array<{ personaName: string; quote: string; quoteCN?: string }>;
  renderCitation: (citations: GuardianLegacyCitationsProps['citations']) => ReactNode;
}

/**
 * 无 presentation 或 decision_committee 时保留旧版专家引用气泡。
 */
export function GuardianLegacyCitations({
  presentation,
  citations,
  renderCitation,
}: GuardianLegacyCitationsProps) {
  if (!citations?.length) return null;
  if (presentation && presentation.mode !== 'decision_committee') return null;
  return <>{renderCitation(citations)}</>;
}
