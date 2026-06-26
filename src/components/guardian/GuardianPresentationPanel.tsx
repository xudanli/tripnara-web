import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GuardianBriefBanner } from '@/components/guardian/GuardianBriefBanner';
import { GuardianChooseModal } from '@/components/guardian/GuardianChooseModal';
import { GuardianDecisionCard } from '@/components/guardian/GuardianDecisionCard';
import { shouldShowPersonaInsightCards, isHardConstraintBlock, canShowGuardianChoose } from '@/lib/guardian-presentation.util';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import { cn } from '@/lib/utils';

export interface GuardianPresentationPanelProps {
  presentation: GuardianPersonaPresentation;
  className?: string;
  /** 软约束取舍点（打开 CHOOSE 弹窗） */
  choosePoints?: string[];
  onChoose?: () => void;
  onChooseConfirm?: (selectedIndex: number, selectedText: string) => void;
  onPrimaryAction?: () => void;
}

/**
 * 按 displayStyle 路由：规划期 design_advisory / 行中 execution_brief。
 */
export function GuardianPresentationPanel({
  presentation,
  className,
  choosePoints,
  onChoose,
  onChooseConfirm,
  onPrimaryAction,
}: GuardianPresentationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);

  const hardBlocked = isHardConstraintBlock(presentation);
  const needsChoose = presentation.actions.user === 'CHOOSE';
  const canChoose = canShowGuardianChoose({
    presentation,
    chooseOptions: choosePoints,
  });

  const openChoose = () => {
    if (hardBlocked || !canChoose) return;
    if (choosePoints?.length || onChooseConfirm) {
      setChooseOpen(true);
    } else {
      onChoose?.();
    }
  };

  const card = (
    <GuardianDecisionCard
      presentation={presentation}
      showSupportingLines
      onChoose={needsChoose && canChoose ? openChoose : onChoose}
    />
  );

  const chooseModal =
    canChoose && choosePoints && choosePoints.length > 0 ? (
      <GuardianChooseModal
        open={chooseOpen}
        onOpenChange={setChooseOpen}
        points={choosePoints}
        onConfirm={onChooseConfirm}
      />
    ) : null;

  if (presentation.displayStyle === 'execution_brief') {
    return (
      <div className={cn('space-y-2', className)}>
        <GuardianBriefBanner
          presentation={presentation}
          onPrimaryAction={
            needsChoose && canChoose
              ? openChoose
              : onPrimaryAction ?? onChoose
          }
        />
        {!shouldShowPersonaInsightCards(presentation) && expanded ? card : null}
        {presentation.supportingLines.length > 0 ||
        presentation.mode === 'decision_committee' ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起详情' : '展开详情'}
          </Button>
        ) : null}
        {chooseModal}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <GuardianDecisionCard
        presentation={presentation}
        onChoose={needsChoose && canChoose ? openChoose : onChoose}
      />
      {chooseModal}
    </div>
  );
}
