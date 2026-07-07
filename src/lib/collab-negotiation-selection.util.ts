import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

export interface NegotiationTaskSelection {
  negotiationTaskId?: string | null;
  roundId?: string | null;
  roundDomain?: string | null;
}

/** 协作决策队列选中：优先 negotiationTaskId，再 roundId / roundDomain */
export function findNegotiationTaskForSelection(
  tasks: DomainNegotiationTask[],
  selection: NegotiationTaskSelection,
): DomainNegotiationTask | undefined {
  const { negotiationTaskId, roundId, roundDomain } = selection;

  if (negotiationTaskId) {
    const byId = tasks.find((t) => t.id === negotiationTaskId);
    if (byId) return byId;
  }

  if (roundId) {
    const byRound = tasks.find((t) => t.activeRoundId === roundId);
    if (byRound) return byRound;
  }

  if (roundDomain) {
    const byDomain = tasks.find((t) => t.domain === roundDomain);
    if (byDomain) return byDomain;
  }

  return undefined;
}

export function resolveNegotiationTaskId(
  tasks: DomainNegotiationTask[],
  selection: NegotiationTaskSelection,
): string | null {
  const match = findNegotiationTaskForSelection(tasks, selection);
  if (match) return match.id;
  return tasks.find((t) => t.status !== 'consensus_reached')?.id ?? null;
}

export function isDecisionProblemNegotiationTask(task: DomainNegotiationTask): boolean {
  return task.source === 'decision_problem' || Boolean(task.decisionProblemId ?? task.problemId);
}
