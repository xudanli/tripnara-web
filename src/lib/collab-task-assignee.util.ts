import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

export type CollabTaskAssigneeScope = 'all' | 'mine' | 'unassigned';

export const COLLAB_TASK_ASSIGNEE_SCOPES: { value: CollabTaskAssigneeScope; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'mine', label: '我的跟进' },
  { value: 'unassigned', label: '未分配' },
];

export function parseCollabTaskAssigneeScope(raw: string | null): CollabTaskAssigneeScope {
  if (raw === 'mine' || raw === 'unassigned') return raw;
  return 'all';
}

/** BFF · GET /collaborative-tasks · 任务分工 Tab */
export function filterMySubTasks(
  tasks: CollaborativeTaskView[],
  currentUserId: string | null | undefined,
): CollaborativeTaskView[] {
  if (!currentUserId) return [];
  return tasks.filter((t) => t.isSubTask && t.assigneeUserId === currentUserId);
}

export function filterUnassignedSubTasks(tasks: CollaborativeTaskView[]): CollaborativeTaskView[] {
  return tasks.filter((t) => t.isSubTask && !t.assigneeUserId);
}

export function isCollaborativeTaskAssigned(task: CollaborativeTaskView): boolean {
  if (task.isSubTask) return Boolean(task.assigneeUserId);
  return Boolean(task.assigneeLabel ?? task.assigneeUserId);
}

export function resolveCollaborativeTaskAssigneeLabel(
  task: CollaborativeTaskView,
  displayNameByUserId?: ReadonlyMap<string, string>,
): string | null {
  if (task.assigneeLabel?.trim()) return task.assigneeLabel.trim();
  if (task.assigneeUserId && displayNameByUserId?.has(task.assigneeUserId)) {
    return displayNameByUserId.get(task.assigneeUserId) ?? null;
  }
  return null;
}

export function enrichCollaborativeTasksWithAssigneeLabels(
  tasks: CollaborativeTaskView[],
  collaborators: readonly { userId: string; displayName?: string | null }[],
): CollaborativeTaskView[] {
  if (!collaborators.length) return tasks;
  const displayNameByUserId = new Map(
    collaborators.map((c) => [c.userId, c.displayName?.trim() || c.userId]),
  );
  return tasks.map((task) => {
    const assigneeLabel = resolveCollaborativeTaskAssigneeLabel(task, displayNameByUserId);
    if (!assigneeLabel || assigneeLabel === task.assigneeLabel) return task;
    return { ...task, assigneeLabel };
  });
}

export function filterTasksByAssigneeScope(
  tasks: CollaborativeTaskView[],
  scope: CollabTaskAssigneeScope,
  currentUserId?: string | null,
): CollaborativeTaskView[] {
  if (scope === 'mine') return filterMySubTasks(tasks, currentUserId);
  if (scope === 'unassigned') return filterUnassignedSubTasks(tasks);
  return tasks;
}

export function countTasksByAssigneeScope(
  tasks: CollaborativeTaskView[],
  currentUserId?: string | null,
): Record<CollabTaskAssigneeScope, number> {
  return {
    all: tasks.length,
    mine: filterMySubTasks(tasks, currentUserId).length,
    unassigned: filterUnassignedSubTasks(tasks).length,
  };
}
