import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { ConstraintConsoleSectionViewModel } from '@/lib/trip-constraints-contract.util';

export type ConstraintSidebarFocusMode = 'full' | 'attention';

/** 规划工作台左侧 · 四组规划条件 */
export const WORKBENCH_PRIMARY_SECTION_KEYS = new Set([
  'travel_objectives',
  'hard_must_satisfy',
  'soft_prefer',
]);

/** 第 4 组 · 当前生效的外部条件（合成章节 key，仅工作台摘要侧栏） */
export const WORKBENCH_EXTERNAL_SECTION_KEY = 'active_external_context';

/** 工作台 · 规划上下文（默认收起，点击展开） */
export const WORKBENCH_PLANNING_CONTEXT_SECTION_KEY = 'planning_context';

/** 归入「行程目标」的基础规划条件（总行程时长等硬边界见 mustComply） */
export const TRIP_OBJECTIVE_CONSTRAINT_IDS = new Set([
  'travelers',
  'transport',
  'must_go',
  'accommodation',
]);

const WORKBENCH_SECTION_TITLES: Partial<Record<string, string>> = {
  travel_objectives: '行程目标',
  hard_must_satisfy: '必须遵守',
  soft_prefer: '尽量满足',
  [WORKBENCH_EXTERNAL_SECTION_KEY]: '当前影响规划',
};

const ATTENTION_COLLAPSED_SECTIONS = new Set([
  WORKBENCH_PLANNING_CONTEXT_SECTION_KEY,
  'travel_objectives',
  'soft_prefer',
  'team_members',
  'change_strategy',
  'automation',
  'readonly_official',
  'readonly_world',
  WORKBENCH_EXTERNAL_SECTION_KEY,
]);

/** 侧栏摘要态 · 默认折叠的次要章节（完整控制台内仍可通过展开查看） */
const SIDEBAR_SECONDARY_SECTIONS = new Set([
  'team_members',
  'change_strategy',
  'automation',
  'conflicts_and_impact',
  'readonly_official',
  'readonly_world',
  WORKBENCH_EXTERNAL_SECTION_KEY,
]);

/** 深链 / 决策空间 / 用户点「冲突」时进入聚焦阅读模式 */
export function resolveConstraintSidebarFocusMode(input: {
  fromTravel?: boolean;
  problemId?: string | null;
  conflictId?: string | null;
  decisionSpaceOpen?: boolean;
  forceAttention?: boolean;
}): ConstraintSidebarFocusMode {
  if (input.forceAttention) return 'attention';
  if (
    input.decisionSpaceOpen ||
    input.fromTravel ||
    input.problemId?.trim() ||
    input.conflictId?.trim()
  ) {
    return 'attention';
  }
  return 'full';
}

export type ConstraintSidebarVariant = 'workbench' | 'full';

export function normalizeConstraintUiId(id: string): string {
  return apiConstraintIdToUi(id);
}

export function isTripObjectiveConstraintEntry(entry: Pick<ConstraintListEntry, 'id'>): boolean {
  const uiId = normalizeConstraintUiId(entry.id);
  return TRIP_OBJECTIVE_CONSTRAINT_IDS.has(uiId);
}

export function partitionHardItemsForWorkbench(items: ConstraintListEntry[]): {
  tripObjectiveItems: ConstraintListEntry[];
  mustComplyItems: ConstraintListEntry[];
} {
  const tripObjectiveItems: ConstraintListEntry[] = [];
  const mustComplyItems: ConstraintListEntry[] = [];
  for (const item of items) {
    if (isTripObjectiveConstraintEntry(item)) {
      tripObjectiveItems.push(item);
    } else {
      mustComplyItems.push(item);
    }
  }
  return { tripObjectiveItems, mustComplyItems };
}

/**
 * readonly_official 中仍属规划 enforce、但 BFF 暂未移入 hard_must_satisfy 的项
 * （如 c_max_segment_distance）。MAX_DAILY_DRIVE / NO_NIGHT_DRIVE 已由 BFF 固定进 hard_must_satisfy。
 */
export const WORKBENCH_ENFORCE_READONLY_UI_IDS = new Set(['max_segment_distance']);

export function isWorkbenchEnforceReadonlyEntry(entry: Pick<ConstraintListEntry, 'id'>): boolean {
  return WORKBENCH_ENFORCE_READONLY_UI_IDS.has(normalizeConstraintUiId(entry.id));
}

export function collectWorkbenchMustComplyItems(
  sections: ConstraintConsoleSectionViewModel[],
): {
  tripObjectiveItems: ConstraintListEntry[];
  mustComplyItems: ConstraintListEntry[];
} {
  const hardSection = sections.find((section) => section.meta.key === 'hard_must_satisfy');
  const officialSection = sections.find((section) => section.meta.key === 'readonly_official');
  const hardItems = hardSection?.items ?? [];
  const seen = new Set(hardItems.map((item) => normalizeConstraintUiId(item.id)));
  const promoted: ConstraintListEntry[] = [];

  for (const item of officialSection?.items ?? []) {
    if (!isWorkbenchEnforceReadonlyEntry(item)) continue;
    const uiId = normalizeConstraintUiId(item.id);
    if (seen.has(uiId)) continue;
    seen.add(uiId);
    promoted.push(item);
  }

  return partitionHardItemsForWorkbench([...hardItems, ...promoted]);
}

export function isActiveExternalConditionEntry(entry: ConstraintListEntry): boolean {
  if (entry.kind === 'external' || entry.readOnly || entry.destinationRule) {
    if (entry.hasConflict || entry.cardTone === 'danger' || entry.cardTone === 'caution') {
      return true;
    }
    if (entry.statusTone === 'warning') return true;
    const label = entry.statusLabel?.trim();
    if (label && /影响|生效|关闭|上升|缩短|不可|偏/.test(label)) return true;
  }
  return false;
}

/** 工作台第 4 组 · 仅保留当前确实影响规划的外部上下文（默认最多 5 项） */
export function collectActiveExternalConditions(
  sections: ConstraintConsoleSectionViewModel[],
  options?: { limit?: number },
): ConstraintListEntry[] {
  const limit = options?.limit ?? 5;
  const worldItems = sections.find((section) => section.meta.key === 'readonly_world')?.items ?? [];
  const officialItems =
    sections.find((section) => section.meta.key === 'readonly_official')?.items ?? [];

  const activeOfficial = officialItems
    .filter((item) => !isWorkbenchEnforceReadonlyEntry(item))
    .filter(isActiveExternalConditionEntry);
  const activeWorld = worldItems.filter(isActiveExternalConditionEntry);

  const merged = [...activeWorld, ...activeOfficial];
  const deduped = [...new Map(merged.map((item) => [item.id, item])).values()];

  if (deduped.length > 0) return deduped.slice(0, limit);
  if (worldItems.length > 0) return worldItems.slice(0, limit);
  if (officialItems.length > 0) return officialItems.slice(0, limit);
  return [];
}

export function countWorkbenchPlanningConditions(input: {
  tripObjectiveItems: ConstraintListEntry[];
  mustComplyItems: ConstraintListEntry[];
  softPrefCount: number;
  /** 旅行目标排序算 1 组，不按每条原则重复计数 */
  hasTravelGoals?: boolean;
  externalCount: number;
}): number {
  return (
    input.tripObjectiveItems.length +
    input.mustComplyItems.length +
    input.softPrefCount +
    (input.hasTravelGoals ? 1 : 0) +
    input.externalCount
  );
}

export function resolveWorkbenchSectionTitle(
  sectionKey: string,
  defaultTitle: string,
  variant: ConstraintSidebarVariant,
): string {
  if (variant !== 'workbench') return defaultTitle;
  return WORKBENCH_SECTION_TITLES[sectionKey] ?? defaultTitle;
}

/** 规划工作台摘要侧栏 · 是否展示该章节（其余进「旅行条件」抽屉） */
export function isWorkbenchSummarySection(
  sectionKey: string,
  _options?: {
    conflictCount?: number;
    hasConflictContent?: boolean;
    destinationRuleCount?: number;
  },
): boolean {
  return WORKBENCH_PRIMARY_SECTION_KEYS.has(sectionKey);
}

export function isConstraintSectionCollapsedByDefault(
  sectionKey: string,
  focusMode: ConstraintSidebarFocusMode,
  variant: ConstraintSidebarVariant = 'full',
): boolean {
  if (variant === 'workbench' && sectionKey === WORKBENCH_EXTERNAL_SECTION_KEY) {
    return true;
  }
  if (variant === 'workbench' && sectionKey === WORKBENCH_PLANNING_CONTEXT_SECTION_KEY) {
    return true;
  }
  if (variant === 'workbench' && sectionKey === 'travel_objectives') {
    return false;
  }
  if (focusMode === 'attention') {
    return ATTENTION_COLLAPSED_SECTIONS.has(sectionKey);
  }
  return SIDEBAR_SECONDARY_SECTIONS.has(sectionKey);
}
