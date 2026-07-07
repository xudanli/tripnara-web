import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

/** 领域结构化协商（4 张领域卡），不含 decision_problem 父级 */
export function filterDomainInfluenceNegotiationTasks(
  tasks: DomainNegotiationTask[],
): DomainNegotiationTask[] {
  return tasks.filter((task) => {
    if (task.source === 'decision_problem') return false;
    if (task.decisionProblemId || task.problemId) return false;
    return !task.source || task.source === 'domain_influence';
  });
}

export function isSuggestedCollaborativeSubTask(task: CollaborativeTaskView): boolean {
  if (!task.isSubTask) return false;
  if (task.id.startsWith('csub_suggested_')) return true;
  const status = task.subTaskStatus ?? '';
  return status === 'suggested' || task.templateId.includes('suggested');
}

export function collaborativeSubTaskDisplayTitle(task: CollaborativeTaskView): string {
  return task.title.trim();
}

export function collaborativeSubTaskProblemId(task: CollaborativeTaskView): string | null {
  return task.decisionProblemId?.trim() || null;
}
