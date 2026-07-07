import {
  assertDecisionSurfaceCountsAligned,
  assertEntityInBothSurfaces,
} from '@/lib/decision-surface-count-alignment.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

export interface DecisionSurfaceAlignmentDevHintProps {
  problemsOpenCount?: number;
  conflictsTotal?: number;
  overviewOpenCount?: number;
  timelineConflictCount?: number;
  timelineConflictCountSource?: string;
  decisionProblems?: DecisionProblemSummary[];
  planningConflicts?: PlanningConflictItem[];
  /** 默认 F208 封路联调 */
  entityRef?: string;
  className?: string;
}

/** 仅开发/联调：多 surface 计数 + 实体可见性对齐提示 */
export function DecisionSurfaceAlignmentDevHint({
  problemsOpenCount,
  conflictsTotal,
  overviewOpenCount,
  timelineConflictCount,
  timelineConflictCountSource,
  decisionProblems = [],
  planningConflicts = [],
  entityRef = 'F208',
  className,
}: DecisionSurfaceAlignmentDevHintProps) {
  if (!import.meta.env.DEV) return null;

  const result = assertDecisionSurfaceCountsAligned({
    problemsOpenCount,
    conflictsTotal,
    overviewOpenCount,
    timelineConflictCount,
    timelineConflictCountSource,
  });

  const messages: string[] = [];
  if (!result.aligned && result.message) {
    messages.push(result.message);
  }

  if (
    entityRef &&
    decisionProblems.length > 0 &&
    planningConflicts.length > 0 &&
    !assertEntityInBothSurfaces(entityRef, decisionProblems, planningConflicts)
  ) {
    messages.push(`${entityRef} 未同时在 decision-problems 与 planning-conflicts 出现`);
  }

  if (!messages.length) return null;

  return (
    <p className={className ?? 'mt-2 px-0.5 text-[10px] leading-relaxed text-muted-foreground'}>
      计数/实体未对齐：{messages.join(' · ')}
    </p>
  );
}
