import { cn } from '@/lib/utils';
import { PlanningConstraintsCard, type PlanningConstraintsCardProps } from './PlanningConstraintsCard';
import { DecisionStrip, type DecisionStripProps } from './DecisionStrip';
import { PlanningHeaderDivider, PlanningHeaderShell } from './plan-studio-header-ui';

export interface PlanStudioPlanningHeaderProps {
  constraints: PlanningConstraintsCardProps;
  strip: DecisionStripProps;
  className?: string;
}

/** 规划工作台顶区：约束摘要 + 决策条 — 视觉统一的双层状态面板 */
export function PlanStudioPlanningHeader({
  constraints,
  strip,
  className,
}: PlanStudioPlanningHeaderProps) {
  return (
    <PlanningHeaderShell className={className}>
      <PlanningConstraintsCard {...constraints} compact embedded />
      <PlanningHeaderDivider />
      <DecisionStrip {...strip} compact embedded />
    </PlanningHeaderShell>
  );
}
