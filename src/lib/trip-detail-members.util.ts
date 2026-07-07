import { classifyCollaborativeTask } from '@/lib/collab-task-filters';
import { isGuestTeamMember } from '@/components/trips/team/TeamTabIntro';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import { aggregateTeamWeights, buildPreferenceSummary, memberRoleLabel } from '@/lib/team-tab-model';
import type { CollabPendingItem } from '@/hooks/useCollabOverview';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { Collaborator, TripDetail } from '@/types/trip';
import type { TeamMember } from '@/types/optimization-v2';

export type TaskColumnKey = 'planning' | 'budget' | 'accommodation' | 'activities' | 'preparation';

export type TaskBoardStatus = 'done' | 'in_progress' | 'pending';

export interface TaskBoardItem {
  id: string;
  title: string;
  assigneeLabel?: string | null;
  status: TaskBoardStatus;
  column: TaskColumnKey;
}

export interface MemberCardView {
  id: string;
  displayName: string;
  roleLabel: string;
  permissionLabel: string;
  confirmed: boolean;
  tags: string[];
  participationDays: number;
  totalDays: number;
  completedTasks: number;
  totalTasks: number;
  suggestionsCount: number;
  isLeader: boolean;
}

export interface TeamOverviewStats {
  totalMembers: number;
  confirmedCount: number;
  pendingCount: number;
  sharedTasks: number;
  pendingApproval: number;
}

export interface PreferenceCardView {
  id: string;
  label: string;
  description: string;
}

export interface CollaborationProgressView {
  overallPercent: number;
  completedPercent: number;
  inProgressPercent: number;
  pendingPercent: number;
}

export const TASK_COLUMNS: Array<{ key: TaskColumnKey; label: string }> = [
  { key: 'planning', label: '行程规划' },
  { key: 'budget', label: '预算与费用' },
  { key: 'accommodation', label: '住宿与交通' },
  { key: 'activities', label: '活动与体验' },
  { key: 'preparation', label: '物品与准备' },
];

const EXPERIENCE_TAG: Record<string, string> = {
  BEGINNER: '新手型',
  INTERMEDIATE: '探索者',
  ADVANCED: '资深玩家',
  EXPERT: '专家型',
};

const FITNESS_TAG: Record<string, string> = {
  LOW: '休闲',
  INTERMEDIATE: '标准',
  HIGH: '高强度',
  ELITE: '挑战',
};

function flywheelStatus(status: CollaborativeTaskView['status']): TaskBoardStatus {
  if (status === 'confirmed') return 'done';
  if (status === 'pending') return 'pending';
  return 'in_progress';
}

function negotiationStatus(status: DomainNegotiationTask['status']): TaskBoardStatus {
  if (status === 'consensus_reached') return 'done';
  if (status === 'in_discussion') return 'in_progress';
  return 'pending';
}

function flywheelColumn(task: CollaborativeTaskView): TaskColumnKey {
  const category = classifyCollaborativeTask(task);
  if (category === 'budget') return 'budget';
  if (category === 'prep') return 'preparation';
  if (category === 'decision') return 'planning';
  const blob = `${task.title} ${task.description ?? ''}`.toLowerCase();
  if (/住宿|酒店|交通|租车|hotel|transport/.test(blob)) return 'accommodation';
  if (/活动|体验|餐厅|activity/.test(blob)) return 'activities';
  return 'planning';
}

function negotiationColumn(task: DomainNegotiationTask): TaskColumnKey {
  switch (task.domain) {
    case 'destination_route':
    case 'main_transport':
      return 'planning';
    case 'accommodation':
    case 'local_transport':
      return 'accommodation';
    case 'activities':
    case 'dining':
      return 'activities';
    case 'shopping':
    case 'insurance_visa':
      return 'preparation';
    default:
      return 'planning';
  }
}

export function buildTaskBoardItems(
  flywheelTasks: CollaborativeTaskView[],
  negotiationTasks: DomainNegotiationTask[],
): TaskBoardItem[] {
  const items: TaskBoardItem[] = [];

  for (const task of flywheelTasks) {
    items.push({
      id: `flywheel-${task.id}`,
      title: task.title,
      assigneeLabel: task.assigneeLabel,
      status: flywheelStatus(task.status),
      column: flywheelColumn(task),
    });
  }

  for (const task of negotiationTasks) {
    items.push({
      id: `neg-${task.id}`,
      title: task.title,
      assigneeLabel: task.leaderDisplayName ?? null,
      status: negotiationStatus(task.status),
      column: negotiationColumn(task),
    });
  }

  return items;
}

export function groupTasksByColumn(items: TaskBoardItem[]): Record<TaskColumnKey, TaskBoardItem[]> {
  const grouped: Record<TaskColumnKey, TaskBoardItem[]> = {
    planning: [],
    budget: [],
    accommodation: [],
    activities: [],
    preparation: [],
  };
  for (const item of items) {
    grouped[item.column].push(item);
  }
  return grouped;
}

export function countTasksForMember(
  member: TeamMember,
  tasks: TaskBoardItem[],
): { completed: number; total: number } {
  const assigned = tasks.filter(
    (t) => t.assigneeLabel && member.displayName.includes(t.assigneeLabel.split('·')[0]?.trim() ?? ''),
  );
  const pool = assigned.length > 0 ? assigned : tasks;
  const total = Math.max(1, Math.ceil(pool.length / Math.max(1, tasks.length > 0 ? 1 : 1)));
  const completed = pool.filter((t) => t.status === 'done').length;
  return {
    completed: assigned.length > 0 ? completed : Math.round(completed / Math.max(1, tasks.length / 4)),
    total: assigned.length > 0 ? assigned.length : total,
  };
}

function permissionLabel(member: TeamMember): string {
  if (member.role === 'LEADER') return '全部权限';
  if (member.role === 'OBSERVER') return '只读查看';
  return '行程与任务编辑';
}

function memberTags(member: TeamMember): string[] {
  const tags: string[] = [];
  const exp = EXPERIENCE_TAG[member.experienceLevel];
  const fit = FITNESS_TAG[member.fitnessLevel];
  if (exp) tags.push(exp);
  if (fit) tags.push(fit);
  const topWeight = Object.entries(member.personalWeights ?? {})
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]?.[0];
  if (topWeight === 'experienceDensity') tags.push('摄影·自然');
  if (topWeight === 'budgetOverrun') tags.push('预算敏感');
  return tags.slice(0, 3);
}

export function teamMemberToCardView(
  member: TeamMember,
  trip: TripDetail,
  tasks: TaskBoardItem[],
  creatorUserId?: string,
): MemberCardView {
  const totalDays = Math.max(1, (trip.TripDay?.length ?? 1) - 1);
  const confirmed = !isGuestTeamMember(member.userId);
  const taskStats = countTasksForMember(member, tasks);

  return {
    id: member.userId,
    displayName: member.displayName,
    roleLabel: memberRoleLabel(member, member.userId === creatorUserId),
    permissionLabel: permissionLabel(member),
    confirmed,
    tags: memberTags(member),
    participationDays: confirmed ? totalDays : Math.max(0, totalDays - 1),
    totalDays,
    completedTasks: taskStats.completed,
    totalTasks: Math.max(taskStats.total, taskStats.completed),
    suggestionsCount: Math.max(0, Math.round((member.decisionWeight ?? 0.2) * 10)),
    isLeader: member.role === 'LEADER',
  };
}

export function collaboratorToCardView(
  collaborator: Collaborator,
  trip: TripDetail,
  tasks: TaskBoardItem[],
): MemberCardView {
  const totalDays = Math.max(1, (trip.TripDay?.length ?? 1) - 1);
  const roleLabel =
    collaborator.role === 'OWNER' ? '领队' : collaborator.role === 'EDITOR' ? '规划者' : '成员';
  const permissionLabel =
    collaborator.role === 'OWNER'
      ? '全部权限'
      : collaborator.role === 'EDITOR'
        ? '预算与支付管理'
        : '只读查看';

  return {
    id: collaborator.userId,
    displayName: collaborator.displayName?.trim() || collaborator.email?.split('@')[0] || '成员',
    roleLabel,
    permissionLabel,
    confirmed: true,
    tags: [collaborator.role === 'EDITOR' ? '协作者' : '查看者'],
    participationDays: totalDays,
    totalDays,
    completedTasks: tasks.filter((t) => t.status === 'done').length,
    totalTasks: Math.max(1, tasks.length),
    suggestionsCount: 0,
    isLeader: collaborator.role === 'OWNER',
  };
}

export function buildTeamOverviewStats(
  members: MemberCardView[],
  flywheelTasks: CollaborativeTaskView[],
  pendingItems: CollabPendingItem[],
): TeamOverviewStats {
  return {
    totalMembers: members.length,
    confirmedCount: members.filter((m) => m.confirmed).length,
    pendingCount: members.filter((m) => !m.confirmed).length,
    sharedTasks: flywheelTasks.length,
    pendingApproval: pendingItems.length,
  };
}

export function buildCollaborationProgress(tasks: TaskBoardItem[]): CollaborationProgressView {
  if (tasks.length === 0) {
    return { overallPercent: 0, completedPercent: 0, inProgressPercent: 0, pendingPercent: 0 };
  }
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const total = tasks.length;
  const completedPercent = Math.round((done / total) * 100);
  const inProgressPercent = Math.round((inProgress / total) * 100);
  const pendingPercent = Math.max(0, 100 - completedPercent - inProgressPercent);
  const overallPercent = completedPercent;
  return { overallPercent, completedPercent, inProgressPercent, pendingPercent };
}

export function buildPreferenceCards(
  trip: TripDetail,
  members: TeamMember[],
  overallConsensus: number,
): PreferenceCardView[] {
  const weights = aggregateTeamWeights(members);
  const summary = buildPreferenceSummary(weights);
  const pace = summary.find((s) => s.label === '节奏偏好')?.level ?? '中';
  const budget = summary.find((s) => s.label === '预算敏感度')?.level ?? '中';
  const experience = summary.find((s) => s.label === '体验优先级')?.level ?? '中';

  const paceText =
    pace === '极高' || pace === '高'
      ? '舒适节奏，偏好轻松安排'
      : pace === '低'
        ? '紧凑节奏，希望充分利用时间'
        : '适中节奏，兼顾体验与休息';

  return [
    {
      id: 'pace',
      label: '旅行节奏',
      description: paceText,
    },
    {
      id: 'activity',
      label: '活动偏好',
      description:
        experience === '极高' || experience === '高'
          ? '自然风光、摄影体验优先'
          : '均衡体验，兼顾地标与休闲',
    },
    {
      id: 'accommodation',
      label: '住宿偏好',
      description: overallConsensus >= 70 ? '中高端酒店，注重舒适度' : '待团队进一步对齐标准',
    },
    {
      id: 'dining',
      label: '餐饮偏好',
      description: '本地特色、海鲜与在地风味',
    },
    {
      id: 'transport',
      label: '交通偏好',
      description: trip.destination ? `${trip.destination} 自驾租车为主` : '自驾租车为主',
    },
    {
      id: 'budget',
      label: '预算倾向',
      description:
        budget === '极高' || budget === '高' ? '对预算较敏感，倾向性价比' : '预算可控，体验优先',
    },
  ];
}

export function resolveDefaultMemberCount(trip: TripDetail): number {
  return Math.max(1, resolveTravelerCount(trip));
}

export function taskStatusLabel(status: TaskBoardStatus): string {
  if (status === 'done') return '已完成';
  if (status === 'in_progress') return '进行中';
  return '待处理';
}

export function taskStatusClass(status: TaskBoardStatus): string {
  if (status === 'done') return 'border-gate-allow-border bg-muted/15 text-success';
  if (status === 'in_progress') return 'border-gate-suggest-border bg-gate-suggest/15 text-gate-suggest-foreground';
  return 'border-border bg-muted/15 text-warning';
}
