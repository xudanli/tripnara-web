import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { buildConstraintImpactMap } from '@/lib/constraint-matrix-impact.util';
import { scrollToPlanStudioRelaxationBar } from '@/lib/plan-studio-scroll.util';
import type { ConstraintFlexKey } from '@/lib/constraint-flexibility.util';
import { PlanningConstraintsCard, type PlanningConstraintsCardProps } from './PlanningConstraintsCard';
import { DecisionStrip, type DecisionStripProps } from './DecisionStrip';
import { RelaxationSuggestionBar, type RelaxationSuggestionBarProps } from './RelaxationSuggestionBar';
import { SolutionMatrixPanel } from './SolutionMatrixPanel';
import type { UseSolutionMatrixModelResult } from '@/hooks/useSolutionMatrixModel';
import type { CompareStripSelection } from '@/lib/decision-strip-compare-cta';
import { PlanningHeaderDivider, PlanningHeaderShell } from './plan-studio-header-ui';

export interface PlanStudioPlanningHeaderProps {
  constraints: PlanningConstraintsCardProps;
  strip: DecisionStripProps;
  solutionMatrix?: {
    tripId: string;
    matrix: UseSolutionMatrixModelResult;
    compareSelection?: CompareStripSelection | null;
    onViewMoreInAssistant?: () => void;
  };
  relaxation?: RelaxationSuggestionBarProps;
  className?: string;
}

/** 规划工作台顶区：决策条 → 约束 + 方案矩阵（桌面并排）→ 松弛建议 */
export function PlanStudioPlanningHeader({
  constraints,
  strip,
  solutionMatrix,
  relaxation,
  className,
}: PlanStudioPlanningHeaderProps) {
  const stripWithSelection: DecisionStripProps = solutionMatrix?.compareSelection
    ? { ...strip, compareSelection: solutionMatrix.compareSelection }
    : strip;

  const matrixVisible = Boolean(solutionMatrix?.matrix.model.visible);

  const constraintImpactByKey = useMemo(
    () =>
      matrixVisible && solutionMatrix
        ? buildConstraintImpactMap(solutionMatrix.matrix.model)
        : undefined,
    [matrixVisible, solutionMatrix],
  );

  const scrollToRelaxation = relaxation ? scrollToPlanStudioRelaxationBar : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <PlanningHeaderShell>
        <DecisionStrip {...stripWithSelection} compact embedded />

        <PlanningHeaderDivider />

        {matrixVisible && solutionMatrix ? (
          <div
            className="lg:grid lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)] lg:items-start"
            data-testid="plan-studio-constraint-solution-row"
          >
            <div className="min-w-0 border-b border-border/50 lg:border-b-0 lg:border-r lg:border-border/50">
              <PlanningConstraintsCard
                {...constraints}
                compact
                embedded
                layoutColumn="start"
                constraintImpactByKey={constraintImpactByKey}
                onScrollToRelaxation={scrollToRelaxation}
              />
            </div>
            <div className="min-w-0">
              <SolutionMatrixPanel
                tripId={solutionMatrix.tripId}
                matrix={solutionMatrix.matrix}
                embedded
                layoutColumn="end"
                onViewMoreInAssistant={solutionMatrix.onViewMoreInAssistant}
              />
            </div>
          </div>
        ) : (
          <PlanningConstraintsCard
            {...constraints}
            compact
            embedded
            onScrollToRelaxation={scrollToRelaxation}
          />
        )}
      </PlanningHeaderShell>
      {relaxation ? <RelaxationSuggestionBar {...relaxation} tripId={strip.tripId} /> : null}
    </div>
  );
}
