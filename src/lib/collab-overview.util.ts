import type { CollabPendingItem, CollabPendingPriority } from '@/hooks/useCollabOverview';
import { buildTaskBoardItems } from '@/lib/trip-detail-members.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import type {
  CollabOverviewCollaborator,
  CollabOverviewResponse,
  CollabOverviewTaskItem,
} from '@/types/collab-overview';
import type { DomainNegotiationTask, DomainNegotiationTaskStatus } from '@/types/domain-negotiation-task';
import type { Collaborator, CollaboratorRole } from '@/types/trip';

const NEGOTIATION_STATUSES = new Set<DomainNegotiationTaskStatus>([
  'pending',
  'in_discussion',
  'consensus_reached',
]);

function isNegotiationTask(task: CollabOverviewTaskItem): boolean {
  if (task.kind === 'negotiation') return true;
  if (task.kind === 'flywheel') return false;
  return Boolean(task.domain) || NEGOTIATION_STATUSES.has(task.status as DomainNegotiationTaskStatus);
}

function negotiationPriority(task: DomainNegotiationTask): CollabPendingPriority {
  if (task.status === 'in_discussion') return '高';
  if (task.crossLevel === 'high') return '高';
  if (task.crossLevel === 'medium') return '中';
  return '低';
}

function toFlywheelTask(task: CollabOverviewTaskItem): CollaborativeTaskView {
  const status =
    task.status === 'confirmed' ||
    task.status === 'pending' ||
    task.status === 'rolled_back' ||
    task.status === 'timed_out'
      ? task.status
      : 'pending';

  return {
    id: task.id,
    templateId: task.templateId ?? task.id,
    title: task.title,
    description: task.description,
    assigneeUserId: task.assigneeUserId,
    assigneeLabel: task.assigneeLabel ?? task.leaderDisplayName,
    status,
    decisionProblemId: task.decisionProblemId,
    resolutionId: task.resolutionId,
    actionPlanId: task.actionPlanId,
  };
}

function toNegotiationTask(task: CollabOverviewTaskItem): DomainNegotiationTask {
  const status = NEGOTIATION_STATUSES.has(task.status as DomainNegotiationTaskStatus)
    ? (task.status as DomainNegotiationTaskStatus)
    : 'pending';

  return {
    id: task.id,
    domain: task.domain ?? 'destination_route',
    title: task.title,
    status,
    statusLabel: status,
    crossLevel: task.crossLevel ?? 'low',
    closesAt: task.closesAt ?? null,
    leaderDisplayName: task.leaderDisplayName ?? task.assigneeLabel ?? undefined,
    activeRoundId: task.activeRoundId,
    decisionProblemId: task.decisionProblemId,
    problemId: task.decisionProblemId,
    resolutionId: task.resolutionId,
    actionPlanId: task.actionPlanId,
  };
}

export function partitionCollabOverviewTasks(tasks: CollabOverviewTaskItem[]): {
  flywheelTasks: CollaborativeTaskView[];
  negotiationTasks: DomainNegotiationTask[];
} {
  const flywheelTasks: CollaborativeTaskView[] = [];
  const negotiationTasks: DomainNegotiationTask[] = [];

  for (const task of tasks) {
    if (isNegotiationTask(task)) {
      negotiationTasks.push(toNegotiationTask(task));
    } else {
      flywheelTasks.push(toFlywheelTask(task));
    }
  }

  return { flywheelTasks, negotiationTasks };
}

export function buildTaskBoardFromCollabOverview(tasks: CollabOverviewTaskItem[]) {
  const { flywheelTasks, negotiationTasks } = partitionCollabOverviewTasks(tasks);
  return buildTaskBoardItems(flywheelTasks, negotiationTasks);
}

export function buildPendingItemsFromCollabOverview(data: CollabOverviewResponse): CollabPendingItem[] {
  const { negotiationTasks, flywheelTasks } = partitionCollabOverviewTasks(data.collaborativeTasks);
  const pendingFlywheel = flywheelTasks.filter((t) => t.status === 'pending');
  const items: CollabPendingItem[] = [];

  for (const task of negotiationTasks) {
    if (task.status === 'pending' || task.status === 'in_discussion') {
      items.push({
        id: `neg-${task.id}`,
        title: task.title,
        priority: negotiationPriority(task),
        kind: 'negotiation',
        domain: task.domain,
        roundId: task.activeRoundId,
      });
    }
  }

  for (const vote of data.silentVotes) {
    if (vote.status === 'open') {
      items.push({
        id: `vote-${vote.id}`,
        title: vote.title,
        priority: '中',
        kind: 'vote',
        voteId: vote.id,
      });
    }
  }

  if (pendingFlywheel.length > 0) {
    items.push({
      id: 'tasks-pending',
      title: `${pendingFlywheel.length} 项协作任务待确认`,
      priority: '中',
      kind: 'task',
    });
  }

  const rank = { 高: 0, 中: 1, 低: 2 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export function mapCollabCollaborators(
  items: CollabOverviewCollaborator[],
  tripId: string,
): Collaborator[] {
  return items.map((c) => ({
    id: c.id,
    tripId,
    userId: c.userId,
    email: c.email,
    displayName: c.displayName,
    role: c.role as CollaboratorRole,
    createdAt: '',
  }));
}

export function resolveCollabProgressPercent(data: CollabOverviewResponse): number {
  return data.teamHealth?.progressPercent ?? 0;
}

export function resolveCollabDiscussionCount(data: CollabOverviewResponse): number {
  if (data.teamHealth?.discussionCount != null) {
    return data.teamHealth.discussionCount;
  }
  const { negotiationTasks } = partitionCollabOverviewTasks(data.collaborativeTasks);
  const openVotes = data.silentVotes.filter((v) => v.status === 'open').length;
  return (
    negotiationTasks.filter((t) => t.status === 'in_discussion' || t.status === 'pending').length +
    openVotes
  );
}

export function resolveOverallConsensus(data: CollabOverviewResponse): number {
  const score = data.frictionRadar?.compatibility?.overallScore;
  if (score != null) return Math.round(score);
  return data.teamHealth?.progressPercent ?? 0;
}
