import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

/** 决策空间协作动作共享上下文 */
export interface DecisionSpaceCollaborationContext {
  conflict?: PlanningConflictItem | null;
  problem?: DecisionProblemSummary | null;
}

/** 决策空间协作动作（协商 / 投票）前置校验 */
export function canStartDecisionSpaceCollaboration(input: {
  travelerCount: number;
  collaboratorCount: number;
}): boolean {
  return input.travelerCount >= 2 || input.collaboratorCount >= 1;
}
