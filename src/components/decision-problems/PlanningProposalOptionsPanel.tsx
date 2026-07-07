import { cn } from '@/lib/utils';
import { DecisionProposalOptionsRow } from '@/components/decision-problems/decision-execution-proposal/DecisionProposalOptionsRow';
import { decisionProposalViewsFromPackOptions } from '@/lib/decision-proposal-option-view.util';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';

export interface PlanningProposalOptionsPanelProps {
  options: PlanningDecisionPackOption[];
  selectedOptionId?: string | null;
  onSelect?: (optionId: string) => void;
  className?: string;
}

/** P0 · 草案 decisionPack.options 结果卡（badge/headline/outcomeItems/costItems/dataBasis） */
export function PlanningProposalOptionsPanel({
  options,
  selectedOptionId,
  onSelect,
  className,
}: PlanningProposalOptionsPanelProps) {
  if (!options.length) return null;

  const views = decisionProposalViewsFromPackOptions(options);

  return (
    <DecisionProposalOptionsRow
      options={views}
      selectedOptionId={selectedOptionId}
      onSelect={onSelect}
      className={cn(className)}
    />
  );
}
