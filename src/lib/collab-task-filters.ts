import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';

export type CollabTaskFilter = 'all' | 'decision' | 'prep' | 'budget' | 'collab';

export const COLLAB_TASK_FILTERS: { value: CollabTaskFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'decision', label: '决策生成' },
  { value: 'prep', label: '行前准备' },
  { value: 'budget', label: '预算相关' },
  { value: 'collab', label: '协作事项' },
];

const PREP_TEMPLATE_IDS = new Set([
  'satellite_dem_offline_verify',
  'ford_gear_shared_checklist',
  'pre_trip_safety_blueprint',
  'shared_gear_ledger',
]);

const DECISION_HINTS = ['negotiation', 'decision', 'vote', 'preference', 'round', '协商', '决策', '投票'];
const PREP_HINTS = ['prep', 'safety', 'gear', 'blueprint', 'verify', 'dem', 'ford', 'ledger', '行前', '装备', '安全', '涉水'];
const BUDGET_HINTS = ['budget', 'cost', 'spend', '预算', '费用', 'money'];

export function parseCollabTaskFilter(raw: string | null): CollabTaskFilter {
  if (raw === 'decision' || raw === 'prep' || raw === 'budget' || raw === 'collab') return raw;
  return 'all';
}

/** 任务领域分类（供筛选 Chips 使用） */
export function classifyCollaborativeTask(task: CollaborativeTaskView): Exclude<CollabTaskFilter, 'all'> {
  if (task.isSubTask || task.templateId.startsWith('decision_subtask:')) return 'decision';
  if (PREP_TEMPLATE_IDS.has(task.templateId)) return 'prep';

  const blob = `${task.templateId} ${task.title} ${task.description ?? ''}`.toLowerCase();

  if (DECISION_HINTS.some((k) => blob.includes(k))) return 'decision';
  if (BUDGET_HINTS.some((k) => blob.includes(k))) return 'budget';
  if (PREP_HINTS.some((k) => blob.includes(k))) return 'prep';

  return 'collab';
}

export function taskFilterLabel(task: CollaborativeTaskView): string {
  const category = classifyCollaborativeTask(task);
  return COLLAB_TASK_FILTERS.find((f) => f.value === category)?.label ?? '协作事项';
}

export function matchesCollabTaskFilter(
  task: CollaborativeTaskView,
  filter: CollabTaskFilter,
): boolean {
  if (filter === 'all') return true;
  return classifyCollaborativeTask(task) === filter;
}

export function countTasksByFilter(
  tasks: CollaborativeTaskView[],
): Record<CollabTaskFilter, number> {
  const counts: Record<CollabTaskFilter, number> = {
    all: tasks.length,
    decision: 0,
    prep: 0,
    budget: 0,
    collab: 0,
  };
  for (const task of tasks) {
    counts[classifyCollaborativeTask(task)] += 1;
  }
  return counts;
}
