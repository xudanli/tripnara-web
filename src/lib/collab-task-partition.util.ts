import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

/** 决策跟进子任务（collaborative-sub-tasks） */
export function filterDecisionFollowUpTasks(
  tasks: CollaborativeTaskView[],
): CollaborativeTaskView[] {
  return tasks.filter((t) => t.isSubTask === true);
}

/** 领域结构化协商（source=domain_influence，非子任务） */
export function filterDomainInfluenceCollaborativeTasks(
  tasks: CollaborativeTaskView[],
): CollaborativeTaskView[] {
  return tasks.filter((t) => !t.isSubTask && t.source === 'domain_influence');
}

/** @deprecated 决策跟进已统一为 isSubTask；不再用 decision_problem 父级协商 */
export function filterOpenDecisionNegotiations(
  tasks: CollaborativeTaskView[],
): CollaborativeTaskView[] {
  return tasks.filter((t) => t.source === 'decision_problem' && !t.isSubTask);
}

export function partitionCollaborativeTasks(tasks: CollaborativeTaskView[]) {
  const decisionFollowUps = filterDecisionFollowUpTasks(tasks);
  const domainNegotiations = filterDomainInfluenceCollaborativeTasks(tasks);
  const seen = new Set([
    ...decisionFollowUps.map((t) => t.id),
    ...domainNegotiations.map((t) => t.id),
  ]);
  const otherTasks = tasks.filter((t) => !seen.has(t.id));

  return { decisionFollowUps, domainNegotiations, openNegotiations: [], otherTasks, all: tasks };
}

export function mergeCollaborativeTasks(
  base: CollaborativeTaskView[],
  extras: CollaborativeTaskView[],
): CollaborativeTaskView[] {
  if (!extras.length) return base;
  const seen = new Set(base.map((t) => t.id));
  const merged = [...base];
  for (const task of extras) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    merged.push(task);
  }
  return merged;
}

/** 统一读路径优先；旧后端无 isSubTask 时合并客户端聚合 */
export function resolveCollaborativeTasksForDisplay(
  unifiedTasks: CollaborativeTaskView[],
  fallbackFollowUps: CollaborativeTaskView[],
): CollaborativeTaskView[] {
  if (filterDecisionFollowUpTasks(unifiedTasks).length > 0) {
    return unifiedTasks;
  }
  return mergeCollaborativeTasks(unifiedTasks, fallbackFollowUps);
}
