import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import {
  classifyCollaborativeTask,
  type CollabTaskFilter,
} from '@/lib/collab-task-filters';
import { isCollaborativeTaskAssigned } from '@/lib/collab-task-assignee.util';

export type CollabTaskKanbanColumn = 'todo' | 'in_progress' | 'to_confirm' | 'done';

export type CollabTaskPriority = '高' | '中' | '低';

export type CollabTaskDomainFilter = 'all' | 'booking' | 'prep' | 'transport' | 'lodging' | 'other';

export const KANBAN_COLUMNS: {
  id: CollabTaskKanbanColumn;
  label: string;
  dotClass: string;
}[] = [
  { id: 'todo', label: '待处理', dotClass: 'bg-amber-500' },
  { id: 'in_progress', label: '进行中', dotClass: 'bg-sky-500' },
  { id: 'to_confirm', label: '待确认', dotClass: 'bg-yellow-400' },
  { id: 'done', label: '已完成', dotClass: 'bg-emerald-500' },
];

export const TASK_DOMAIN_FILTERS: { value: CollabTaskDomainFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'booking', label: '预订' },
  { value: 'prep', label: '行前准备' },
  { value: 'transport', label: '交通出行' },
  { value: 'lodging', label: '住宿' },
  { value: 'other', label: '其他' },
];

export const TASK_PRIORITY_FILTERS: { value: CollabTaskPriority | 'all'; label: string; tone?: string }[] = [
  { value: 'all', label: '全部' },
  { value: '高', label: '高', tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300' },
  { value: '中', label: '中', tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' },
  { value: '低', label: '低', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' },
];

const DOMAIN_MAP: Record<Exclude<CollabTaskFilter, 'all'>, CollabTaskDomainFilter> = {
  decision: 'booking',
  prep: 'prep',
  budget: 'transport',
  collab: 'other',
};

export function taskKanbanColumn(task: CollaborativeTaskView): CollabTaskKanbanColumn {
  if (task.status === 'confirmed') return 'done';
  if (task.status === 'timed_out') return 'todo';
  if (task.status === 'rolled_back') return 'in_progress';
  if (task.status === 'pending') {
    return isCollaborativeTaskAssigned(task) ? 'to_confirm' : 'todo';
  }
  return 'todo';
}

export function taskPriorityLevel(task: CollaborativeTaskView): CollabTaskPriority {
  if (task.status === 'timed_out' || task.status === 'pending') return '高';
  if (task.status === 'rolled_back') return '中';
  return '低';
}

export function taskDomainFilter(task: CollaborativeTaskView): CollabTaskDomainFilter {
  return DOMAIN_MAP[classifyCollaborativeTask(task)];
}

export function taskDomainLabel(filter: CollabTaskDomainFilter): string {
  return TASK_DOMAIN_FILTERS.find((f) => f.value === filter)?.label ?? '其他';
}

export function taskProgressPct(task: CollaborativeTaskView): number {
  if (task.status === 'confirmed') return 100;
  if (task.status === 'rolled_back') return 45;
  if (task.status === 'pending') return 35;
  if (task.status === 'timed_out') return 5;
  return 0;
}

export function taskDueHint(task: CollaborativeTaskView): { label: string; overdue?: boolean } | null {
  if (task.status === 'timed_out') return { label: '已超时', overdue: true };
  const last = task.behaviorLog?.at(-1)?.at;
  if (!last) return null;
  try {
    const date = new Date(last);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 2 && task.status !== 'confirmed') {
      return { label: `逾期 ${diffDays} 天`, overdue: true };
    }
    return {
      label: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    };
  } catch {
    return null;
  }
}

export interface CollabTaskBoardStats {
  total: number;
  inProgress: number;
  pending: number;
  completed: number;
  completionRate: number;
}

export function buildCollabTaskBoardStats(tasks: CollaborativeTaskView[]): CollabTaskBoardStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'confirmed').length;
  const pending = tasks.filter((t) => taskKanbanColumn(t) === 'todo').length;
  const inProgress = tasks.filter((t) => {
    const col = taskKanbanColumn(t);
    return col === 'in_progress' || col === 'to_confirm';
  }).length;

  return {
    total,
    inProgress,
    pending,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

const OVERDUE_DOMAIN_LABELS: Partial<Record<CollabTaskDomainFilter, string>> = {
  booking: '预订确认',
  prep: '装备准备',
  transport: '交通出行',
  lodging: '住宿安排',
};

export interface CollabTaskAiSummaryView {
  text: string;
  prefix?: string;
  highlights?: string[];
  suffix?: string;
}

export function buildCollabTaskAiSummaryView(tasks: CollaborativeTaskView[]): CollabTaskAiSummaryView {
  if (tasks.length === 0) {
    return {
      text: '暂无协作任务。决策确认与行前准备完成后，相关任务会自动出现在看板中。',
    };
  }

  const overdue = tasks.filter((t) => t.status === 'timed_out');
  if (overdue.length > 0) {
    const domains = [
      ...new Set(
        overdue
          .map((t) => OVERDUE_DOMAIN_LABELS[taskDomainFilter(t)])
          .filter((label): label is string => Boolean(label)),
      ),
    ].slice(0, 2);

    if (domains.length >= 1) {
      return {
        text: `当前逾期工作主要集中在${domains.join('与')}，建议优先处理以降低风险。`,
        prefix: '当前逾期工作主要集中在',
        highlights: domains,
        suffix: '，建议优先处理以降低风险。',
      };
    }

    return {
      text: `当前有 ${overdue.length} 项任务已逾期，建议优先处理以降低风险。`,
    };
  }

  const unassigned = tasks.filter((t) => !isCollaborativeTaskAssigned(t) && t.status !== 'confirmed').length;
  const prep = tasks.filter((t) => taskDomainFilter(t) === 'prep').length;
  const stats = buildCollabTaskBoardStats(tasks);

  if (prep > 0 && stats.pending > 0) {
    return {
      text: '当前待办主要集中在行前准备与预订确认，建议优先推进以降低出发风险。',
      prefix: '当前待办主要集中在',
      highlights: ['行前准备', '预订确认'],
      suffix: '，建议优先推进以降低出发风险。',
    };
  }

  if (unassigned > 0) {
    return {
      text: `共有 ${unassigned} 项任务尚未分配负责人，建议先完成分配再推进执行。`,
    };
  }

  return {
    text: `当前共 ${tasks.length} 项任务，完成率 ${stats.completionRate}%，可按看板优先级逐项推进。`,
  };
}

export function buildCollabTaskAiSummary(tasks: CollaborativeTaskView[]): string {
  return buildCollabTaskAiSummaryView(tasks).text;
}

export function filterTasksForBoard(
  tasks: CollaborativeTaskView[],
  options: {
    search?: string;
    priority?: CollabTaskPriority | 'all';
    domain?: CollabTaskDomainFilter;
    ownerUserId?: string | null;
  },
): CollaborativeTaskView[] {
  const q = options.search?.trim().toLowerCase();
  return tasks.filter((task) => {
    if (options.priority && options.priority !== 'all' && taskPriorityLevel(task) !== options.priority) {
      return false;
    }
    if (options.domain && options.domain !== 'all' && taskDomainFilter(task) !== options.domain) {
      return false;
    }
    if (options.ownerUserId === 'unassigned') {
      if (isCollaborativeTaskAssigned(task)) return false;
    } else if (options.ownerUserId) {
      if (task.assigneeUserId !== options.ownerUserId) return false;
    }
    if (q) {
      const blob = `${task.title} ${task.description ?? ''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function countTasksByKanbanColumn(
  tasks: CollaborativeTaskView[],
): Record<CollabTaskKanbanColumn, number> {
  const counts: Record<CollabTaskKanbanColumn, number> = {
    todo: 0,
    in_progress: 0,
    to_confirm: 0,
    done: 0,
  };
  for (const task of tasks) {
    counts[taskKanbanColumn(task)] += 1;
  }
  return counts;
}

export function countTasksByOwner(
  tasks: CollaborativeTaskView[],
  collaborators: readonly { userId: string; displayName?: string | null }[],
): { userId: string; displayName: string; count: number }[] {
  const counts = new Map<string, number>();
  let unassigned = 0;

  for (const task of tasks) {
    if (task.status === 'confirmed') continue;
    if (!task.assigneeUserId) {
      unassigned += 1;
      continue;
    }
    counts.set(task.assigneeUserId, (counts.get(task.assigneeUserId) ?? 0) + 1);
  }

  const rows = collaborators.map((c) => ({
    userId: c.userId,
    displayName: c.displayName?.trim() || c.userId,
    count: counts.get(c.userId) ?? 0,
  }));

  rows.sort((a, b) => b.count - a.count);
  if (unassigned > 0) {
    rows.push({ userId: 'unassigned', displayName: '未分配', count: unassigned });
  }
  return rows;
}
