import type { DomainNegotiationTask, DomainNegotiationTaskStatus } from '@/types/domain-negotiation-task';
import type { DomainInfluenceItem, DomainInfluenceSnapshot, TripDomain } from '@/types/trip-domain-influence';

const STATUS_LABELS: Record<DomainNegotiationTaskStatus, string> = {
  pending: '待开始',
  in_discussion: '讨论中',
  consensus_reached: '已达成共识',
};

/** 领域是否已有认领（结构化协商前置条件） */
export function domainHasActiveClaim(domainItem: DomainInfluenceItem | undefined): boolean {
  if (!domainItem) return false;
  if (domainItem.claims.length > 0) return true;
  if (domainItem.leaderUserId) return true;
  return !domainItem.unclaimed;
}

function findDomainItem(snapshot: DomainInfluenceSnapshot | null, domain: TripDomain) {
  return snapshot?.domains.find((d) => d.domain === domain);
}

/**
 * 后端 / Agent 可能提前创建 preference-round，导致任务显示「讨论中」但领域无人认领。
 * 前端按领域影响力快照校正展示状态（不改写后端数据）。
 */
export function reconcileNegotiationTaskWithDomainClaims(
  task: DomainNegotiationTask,
  snapshot: DomainInfluenceSnapshot | null,
): DomainNegotiationTask {
  const domainItem = findDomainItem(snapshot, task.domain);
  const hasClaim = domainHasActiveClaim(domainItem);

  if (hasClaim) {
    return {
      ...task,
      claimCount: task.claimCount ?? domainItem?.claims.length,
      leaderDisplayName: task.leaderDisplayName ?? domainItem?.leaderDisplayName ?? undefined,
    };
  }

  if (task.status === 'in_discussion' || task.activeRoundId) {
    return {
      ...task,
      status: 'pending',
      statusLabel: STATUS_LABELS.pending,
      activeRoundId: null,
      claimCount: 0,
      leaderDisplayName: undefined,
    };
  }

  return task;
}

export function reconcileNegotiationTasksWithDomainClaims(
  tasks: DomainNegotiationTask[],
  snapshot: DomainInfluenceSnapshot | null,
): DomainNegotiationTask[] {
  if (!snapshot) return tasks;
  return tasks.map((task) => reconcileNegotiationTaskWithDomainClaims(task, snapshot));
}
