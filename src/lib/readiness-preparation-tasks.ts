import type { EnhancedRisk } from '@/api/readiness';
import { resolveRiskTypeLabel } from '@/lib/risk-display.util';
import {
  getActionableMitigations,
  mitigationKey,
} from '@/lib/risk-mitigation-progress';
import {
  resolveMatchSquareRosterFromContext,
  type MatchSquareRosterMember,
} from '@/lib/match-square-trip-roster';

export type ReadinessTaskScope = 'team' | 'personal';

export type ReadinessTaskSource = 'risk' | 'manual';

export type ReadinessTaskCategory =
  | 'booking_flight'
  | 'booking_hotel'
  | 'booking_transport'
  | 'booking_activity'
  | 'document'
  | 'prep'
  | 'other';

export interface ReadinessPreparationTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  scope: ReadinessTaskScope;
  source?: ReadinessTaskSource;
  category?: ReadinessTaskCategory;
  /** 用户手动编辑后，风险同步不再覆盖标题/优先级/范围 */
  userEdited?: boolean;
  sourceRiskId?: string;
  sourceRiskLabel?: string;
  assigneeUserId?: string | null;
  assigneeLabel?: string | null;
  completed: boolean;
  createdAt: string;
}

export interface ReadinessTaskMember {
  userId: string;
  displayName: string;
  role: 'captain' | 'member';
}

const storageKey = (tripId: string) => `readiness_preparation_tasks_${tripId}`;

const PERSONAL_PATTERNS =
  /携带|带齐|准备.*设备|个人|随身|wear|carry|bring|pack|equipment|personal/i;
const TEAM_PATTERNS =
  /规划|计划|协调|安排|调研|确认|分工|一起|全队|plan|coordinate|research|schedule|team/i;

export function inferTaskScope(action: string): ReadinessTaskScope {
  if (PERSONAL_PATTERNS.test(action)) return 'personal';
  if (TEAM_PATTERNS.test(action)) return 'team';
  return 'team';
}

export function isManualTask(task: ReadinessPreparationTask): boolean {
  return task.source === 'manual' || task.id.startsWith('manual:');
}

export const TASK_QUICK_TEMPLATES: Array<{
  category: ReadinessTaskCategory;
  titleZh: string;
  titleEn: string;
  scope: ReadinessTaskScope;
  priority: ReadinessPreparationTask['priority'];
}> = [
  { category: 'booking_flight', titleZh: '订机票', titleEn: 'Book flights', scope: 'team', priority: 'high' },
  { category: 'booking_hotel', titleZh: '订酒店', titleEn: 'Book hotels', scope: 'team', priority: 'high' },
  { category: 'booking_transport', titleZh: '租车 / 订火车票', titleEn: 'Car rental / rail', scope: 'team', priority: 'medium' },
  { category: 'booking_activity', titleZh: '预订活动 / 门票', titleEn: 'Book activities / tickets', scope: 'team', priority: 'medium' },
  { category: 'document', titleZh: '签证 / 保险', titleEn: 'Visa / insurance', scope: 'personal', priority: 'high' },
  { category: 'prep', titleZh: '行前打包准备', titleEn: 'Packing prep', scope: 'personal', priority: 'medium' },
];

export function categoryLabel(category: ReadinessTaskCategory | undefined, isZh: boolean): string | null {
  if (!category) return null;
  const map: Record<ReadinessTaskCategory, { zh: string; en: string }> = {
    booking_flight: { zh: '机票', en: 'Flight' },
    booking_hotel: { zh: '酒店', en: 'Hotel' },
    booking_transport: { zh: '交通', en: 'Transport' },
    booking_activity: { zh: '活动', en: 'Activity' },
    document: { zh: '证件', en: 'Documents' },
    prep: { zh: '准备', en: 'Prep' },
    other: { zh: '其他', en: 'Other' },
  };
  return isZh ? map[category].zh : map[category].en;
}

export function createManualTask(
  input: {
    title: string;
    scope: ReadinessTaskScope;
    priority: ReadinessPreparationTask['priority'];
    category?: ReadinessTaskCategory;
    assigneeUserId?: string | null;
    assigneeLabel?: string | null;
  },
  members: ReadinessTaskMember[],
): ReadinessPreparationTask {
  const scope = input.scope;
  const defaultAssignee = members[0];
  return {
    id: `manual:${crypto.randomUUID()}`,
    title: input.title.trim(),
    priority: input.priority,
    scope,
    source: 'manual',
    category: input.category ?? 'other',
    userEdited: true,
    assigneeUserId:
      input.assigneeUserId ??
      (scope === 'personal' ? defaultAssignee?.userId ?? null : null),
    assigneeLabel:
      input.assigneeLabel ??
      (scope === 'personal' ? defaultAssignee?.displayName ?? null : null),
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export function sortTasks(tasks: ReadinessPreparationTask[]): ReadinessPreparationTask[] {
  return [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const scopeOrder = { team: 0, personal: 1 };
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    const s = scopeOrder[a.scope] - scopeOrder[b.scope];
    if (s !== 0) return s;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function loadPreparationTasks(tripId: string): ReadinessPreparationTask[] {
  try {
    const stored = localStorage.getItem(storageKey(tripId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreparationTasks(tripId: string, tasks: ReadinessPreparationTask[]): void {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export function resolveTaskMembers(
  tripId: string,
  viewer?: { id: string; name?: string | null } | null,
): ReadinessTaskMember[] {
  const roster = resolveMatchSquareRosterFromContext(tripId);
  if (roster?.members.length) {
    return roster.members.map((m: MatchSquareRosterMember) => ({
      userId: m.userId,
      displayName: m.displayName,
      role: m.role,
    }));
  }
  if (viewer?.id) {
    return [
      {
        userId: viewer.id,
        displayName: viewer.name?.trim() || '我',
        role: 'captain',
      },
    ];
  }
  return [];
}

export function syncTasksFromRisks(
  risks: EnhancedRisk[],
  existing: ReadinessPreparationTask[],
  isZh: boolean,
  members: ReadinessTaskMember[],
  checkedMitigationKeys?: Set<string>,
): ReadinessPreparationTask[] {
  const byId = new Map(existing.map((task) => [task.id, task]));
  const defaultPersonalAssignee = members[0];

  for (const risk of risks) {
    const riskLabel = resolveRiskTypeLabel(risk, isZh);
    getActionableMitigations(risk).forEach((detail, index) => {
      const id = mitigationKey(risk, index);
      const scope = inferTaskScope(detail.action);
      const prev = byId.get(id);
      if (prev) {
        const preserveFields = prev.userEdited || isManualTask(prev);
        byId.set(id, {
          ...prev,
          source: prev.source ?? 'risk',
          ...(preserveFields
            ? {}
            : {
                title: detail.action,
                priority: detail.priority,
                scope,
              }),
          sourceRiskId: risk.id,
          sourceRiskLabel: riskLabel,
          completed: checkedMitigationKeys?.has(id) ?? prev.completed,
        });
        return;
      }

      byId.set(id, {
        id,
        title: detail.action,
        priority: detail.priority,
        scope,
        source: 'risk',
        sourceRiskId: risk.id,
        sourceRiskLabel: riskLabel,
        assigneeUserId:
          scope === 'personal' ? defaultPersonalAssignee?.userId ?? null : null,
        assigneeLabel:
          scope === 'personal' ? defaultPersonalAssignee?.displayName ?? null : null,
        completed: checkedMitigationKeys?.has(id) ?? false,
        createdAt: new Date().toISOString(),
      });
    });
  }

  return sortTasks([...byId.values()]);
}

export function countTaskProgress(tasks: ReadinessPreparationTask[]): {
  total: number;
  done: number;
  remaining: number;
  teamTotal: number;
  teamRemaining: number;
  personalTotal: number;
  personalRemaining: number;
} {
  const team = tasks.filter((t) => t.scope === 'team');
  const personal = tasks.filter((t) => t.scope === 'personal');
  const done = tasks.filter((t) => t.completed).length;
  return {
    total: tasks.length,
    done,
    remaining: tasks.filter((t) => !t.completed).length,
    teamTotal: team.length,
    teamRemaining: team.filter((t) => !t.completed).length,
    personalTotal: personal.length,
    personalRemaining: personal.filter((t) => !t.completed).length,
  };
}

export function tasksByScope(tasks: ReadinessPreparationTask[]): {
  team: ReadinessPreparationTask[];
  personal: ReadinessPreparationTask[];
} {
  return {
    team: tasks.filter((t) => t.scope === 'team'),
    personal: tasks.filter((t) => t.scope === 'personal'),
  };
}

export function updateTask(
  tasks: ReadinessPreparationTask[],
  taskId: string,
  patch: Partial<
    Pick<
      ReadinessPreparationTask,
      | 'completed'
      | 'assigneeUserId'
      | 'assigneeLabel'
      | 'scope'
      | 'title'
      | 'priority'
      | 'category'
      | 'userEdited'
    >
  >,
): ReadinessPreparationTask[] {
  return sortTasks(
    tasks.map((task) => {
      if (task.id !== taskId) return task;
      const next = { ...task, ...patch };
      if (patch.title !== undefined || patch.priority !== undefined || patch.scope !== undefined) {
        next.userEdited = true;
      }
      return next;
    }),
  );
}

export function addManualTask(
  tasks: ReadinessPreparationTask[],
  task: ReadinessPreparationTask,
): ReadinessPreparationTask[] {
  return sortTasks([...tasks, task]);
}

export function deleteTask(
  tasks: ReadinessPreparationTask[],
  taskId: string,
): ReadinessPreparationTask[] {
  return tasks.filter((t) => t.id !== taskId);
}
