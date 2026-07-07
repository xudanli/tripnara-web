import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { ApplyDecisionProblemResponse } from '@/generated/unified-decision-contracts';

import type { PlanningDecisionExecutionStep } from '@/types/planning-decision-pack';

export type DecisionWriteBackStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface DecisionWriteBackStep {
  id: string;
  label: string;
  status: DecisionWriteBackStepStatus;
}

function countRouteRecalculations(diff: ItineraryDiffEntry[]): number {
  return diff.filter(
    (row) => row.changeType === 'time_changed' || row.changeType === 'title_changed',
  ).length;
}

/** 写回后系统动作步骤（优先 BFF executionSteps[]） */
export function buildDecisionWriteBackSteps(input: {
  phase: 'idle' | 'applying' | 'done';
  itineraryDiff?: ItineraryDiffEntry[];
  memberNotifyCount?: number;
  applyResult?: ApplyDecisionProblemResponse | null;
  tripVersionAfter?: string | null;
  executionSteps?: PlanningDecisionExecutionStep[];
}): DecisionWriteBackStep[] {
  if (input.executionSteps?.length) {
    return input.executionSteps.map((step) => ({
      id: step.id,
      label: step.label,
      status:
        input.phase === 'done'
          ? step.status === 'failed'
            ? 'failed'
            : 'done'
          : input.phase === 'applying' && step.status === 'running'
            ? 'running'
            : step.status,
    }));
  }

  const diff = input.itineraryDiff ?? [];
  const timePointChanges = diff.filter((row) => row.changeType === 'time_changed').length;
  const routeRecalcs = countRouteRecalculations(diff);
  const members = input.memberNotifyCount ?? 0;
  const tripVersionUpdated = Boolean(
    input.tripVersionAfter?.trim() ||
      input.applyResult?.tripVersionAfter?.trim() ||
      input.applyResult?.executionStatus,
  );

  const steps: Array<{ id: string; label: string; relevant: boolean }> = [
    {
      id: 'version',
      label: '行程版本已更新',
      relevant: tripVersionUpdated || input.phase === 'done',
    },
    {
      id: 'routes',
      label:
        routeRecalcs > 0
          ? `路线已重新计算（${routeRecalcs} 段）`
          : '路线已重新计算',
      relevant: routeRecalcs > 0 || timePointChanges > 0 || input.phase === 'done',
    },
    {
      id: 'conflicts',
      label: '时间冲突已重新检查',
      relevant: true,
    },
    {
      id: 'members',
      label:
        members > 0 ? `相关成员已通知（${members} 人）` : '相关成员已通知',
      relevant: members > 0,
    },
    {
      id: 'resolved',
      label: '该决策已解决',
      relevant: true,
    },
  ];

  const visible = steps.filter((step) => step.relevant);
  const list = visible.length >= 3 ? visible : steps.slice(0, 4);

  return list.map((step) => ({
    id: step.id,
    label: step.label,
    status:
      input.phase === 'applying'
        ? step.id === 'version'
          ? 'running'
          : 'pending'
        : input.phase === 'done'
          ? 'done'
          : 'pending',
  }));
}

export function advanceWriteBackStepStatuses(
  steps: DecisionWriteBackStep[],
  activeIndex: number,
): DecisionWriteBackStep[] {
  return steps.map((step, index) => {
    if (index < activeIndex) return { ...step, status: 'done' };
    if (index === activeIndex) return { ...step, status: 'running' };
    return { ...step, status: 'pending' };
  });
}
