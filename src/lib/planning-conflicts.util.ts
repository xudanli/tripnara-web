/**
 * P0-1 规划冲突中心 — 聚合 feasibility issues + Plan Studio getConflicts
 */
import { dedupeFeasibilityIssues } from '@/lib/feasibility-issue-dedupe';
import { resolveFeasibilityIssueVisualCategory } from '@/lib/feasibility-issue-display';
import { isLunchValidationConflict } from '@/lib/plan-studio-conflict-filters';
import type { PlanStudioConflict } from '@/types/trip';
import type {
  PlanningConflictCategory,
  PlanningConflictDto,
  PlanningConflictSource,
  PlanningConflictsSummaryDto,
} from '@/types/planning-conflicts';
import type {
  FeasibilityIssueDto,
  FeasibilityIssuePriority,
} from '@/types/trip-feasibility-report';

export type { PlanningConflictCategory, PlanningConflictSource };

export interface PlanningConflictItem extends PlanningConflictDto {
  categoryLabel: string;
}

export type PlanningConflictSummary = PlanningConflictsSummaryDto;

const CATEGORY_LABELS: Record<PlanningConflictCategory, string> = {
  schedule: '日程',
  transport: '交通',
  team_fit: '团队',
  access_capacity: '准入',
  experience_expectation: '体验',
  booking: '开放预订',
  structure: '行程结构',
  environment: '环境',
  other: '其他',
};

const PRIORITY_RANK: Record<FeasibilityIssuePriority, number> = {
  must_handle: 3,
  suggest_adjust: 2,
  pending_confirm: 1,
};

function studioSeverityToPriority(severity: PlanStudioConflict['severity']): FeasibilityIssuePriority {
  if (severity === 'HIGH') return 'must_handle';
  if (severity === 'MEDIUM') return 'suggest_adjust';
  return 'pending_confirm';
}

function studioTypeToCategory(type: PlanStudioConflict['type']): PlanningConflictCategory {
  switch (type) {
    case 'TRANSPORT_TOO_LONG':
    case 'TRANSPORT_INSUFFICIENT':
      return 'transport';
    case 'BUFFER_INSUFFICIENT':
    case 'TIME_CONFLICT':
      return 'schedule';
    case 'FATIGUE_EXCEEDED':
      return 'team_fit';
    case 'CLOSURE_RISK':
    case 'SEASONAL_CONFLICT':
      return 'booking';
    case 'DUPLICATE_ITEM':
      return 'structure';
    case 'ACCESSIBILITY_MISMATCH':
      return 'team_fit';
    default:
      return 'schedule';
  }
}

function parseDayNumber(day: string | undefined): number | undefined {
  if (!day) return undefined;
  const n = Number(day);
  return Number.isFinite(n) ? n : undefined;
}

function itemIdsFromIssue(issue: FeasibilityIssueDto): Set<string> {
  const ids = new Set<string>();
  for (const id of issue.anchors?.fromItemId ? [issue.anchors.fromItemId] : []) ids.add(id);
  for (const id of issue.anchors?.toItemId ? [issue.anchors.toItemId] : []) ids.add(id);
  for (const proof of issue.proofs ?? []) {
    if (proof.itemId) ids.add(proof.itemId);
    if (proof.fromItemId) ids.add(proof.fromItemId);
    if (proof.toItemId) ids.add(proof.toItemId);
  }
  return ids;
}

function studioConflictMatchesIssue(conflict: PlanStudioConflict, issue: FeasibilityIssueDto): boolean {
  const conflictItems = new Set(conflict.affectedItemIds ?? []);
  if (conflictItems.size === 0) return false;
  const issueItems = itemIdsFromIssue(issue);
  for (const id of conflictItems) {
    if (issueItems.has(id)) return true;
  }
  const issueDays = new Set(issue.affectedDays ?? []);
  for (const d of conflict.affectedDays ?? []) {
    const n = parseDayNumber(d);
    if (n != null && issueDays.has(n)) return true;
  }
  return false;
}

function visualCategoryToPlanningCategory(visual: string): PlanningConflictCategory {
  if (visual === 'itinerary_completeness') return 'structure';
  if (visual in CATEGORY_LABELS) return visual as PlanningConflictCategory;
  return 'other';
}

function fromFeasibilityIssue(issue: FeasibilityIssueDto): PlanningConflictItem {
  const visual = resolveFeasibilityIssueVisualCategory(issue);
  const category = visualCategoryToPlanningCategory(visual);
  return {
    id: issue.id,
    source: 'feasibility',
    priority: issue.priority ?? 'suggest_adjust',
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? CATEGORY_LABELS.other,
    title: issue.title ?? issue.message ?? issue.id,
    message: issue.message ?? issue.actionRequired ?? '',
    affectedDays: issue.affectedDays,
    issue,
  };
}

function fromStudioConflict(conflict: PlanStudioConflict): PlanningConflictItem {
  const category = studioTypeToCategory(conflict.type);
  return {
    id: `studio:${conflict.id}`,
    source: 'schedule',
    priority: studioSeverityToPriority(conflict.severity),
    category,
    categoryLabel: CATEGORY_LABELS[category],
    title: conflict.title,
    message: conflict.description,
    affectedDays: (conflict.affectedDays ?? [])
      .map(parseDayNumber)
      .filter((n): n is number => n != null),
    studioConflict: conflict,
  };
}

/** 合并并去重：feasibility 优先；schedule 冲突若已被 issue 覆盖则丢弃 */
export function mergePlanningConflicts(
  issues: FeasibilityIssueDto[] | undefined,
  studioConflicts: PlanStudioConflict[] | undefined,
): PlanningConflictItem[] {
  const feasibilityItems = dedupeFeasibilityIssues(issues ?? []).issues.map(fromFeasibilityIssue);
  const matchedStudio = new Set<string>();

  for (const item of feasibilityItems) {
    if (!item.issue) continue;
    for (const c of studioConflicts ?? []) {
      if (isLunchValidationConflict(c)) continue;
      if (studioConflictMatchesIssue(c, item.issue)) {
        matchedStudio.add(c.id);
      }
    }
  }

  const scheduleOnly = (studioConflicts ?? [])
    .filter((c) => !isLunchValidationConflict(c))
    .filter((c) => !matchedStudio.has(c.id))
    .map(fromStudioConflict);

  return [...feasibilityItems, ...scheduleOnly].sort((a, b) => {
    const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (pr !== 0) return pr;
    return a.title.localeCompare(b.title, 'zh');
  });
}

export function summarizePlanningConflicts(items: PlanningConflictItem[]): PlanningConflictSummary {
  const summary: PlanningConflictSummary = {
    total: items.length,
    mustHandle: 0,
    suggestAdjust: 0,
    pendingConfirm: 0,
    byCategory: {},
  };
  for (const item of items) {
    if (item.priority === 'must_handle') summary.mustHandle += 1;
    else if (item.priority === 'suggest_adjust') summary.suggestAdjust += 1;
    else summary.pendingConfirm += 1;
    summary.byCategory[item.category] = (summary.byCategory[item.category] ?? 0) + 1;
  }
  return summary;
}

export function filterPlanningConflictsByCategory(
  items: PlanningConflictItem[],
  category: PlanningConflictCategory | 'all',
): PlanningConflictItem[] {
  if (category === 'all') return items;
  return items.filter((item) => item.category === category);
}

export type PlanningConflictsViewMode = 'pending' | 'all';

/** 选项 A：收件箱项 = 必处理 + 时间轴独有（未并入 report） */
export function isPlanningConflictInboxItem(item: PlanningConflictItem): boolean {
  return item.priority === 'must_handle' || item.source === 'schedule';
}

export function filterPlanningConflictsByViewMode(
  items: PlanningConflictItem[],
  mode: PlanningConflictsViewMode,
): PlanningConflictItem[] {
  if (mode === 'all') return items;
  return items.filter(isPlanningConflictInboxItem);
}

export interface PlanningConflictsInboxMetrics {
  /** Tab 角标：must + schedule-only */
  inboxCount: number;
  mustCount: number;
  scheduleOnlyCount: number;
  /** suggest + pending_confirm */
  optimizableCount: number;
  totalCount: number;
}

export function computePlanningConflictsInboxMetrics(
  items: PlanningConflictItem[],
): PlanningConflictsInboxMetrics {
  let mustCount = 0;
  let scheduleOnlyCount = 0;
  let optimizableCount = 0;

  for (const item of items) {
    if (item.source === 'schedule') scheduleOnlyCount += 1;
    if (item.priority === 'must_handle') mustCount += 1;
    else optimizableCount += 1;
  }

  const inboxItems = items.filter(isPlanningConflictInboxItem);

  return {
    inboxCount: inboxItems.length,
    mustCount,
    scheduleOnlyCount,
    optimizableCount,
    totalCount: items.length,
  };
}

export function summarizePlanningConflictsForView(
  items: PlanningConflictItem[],
  mode: PlanningConflictsViewMode,
): PlanningConflictSummary {
  return summarizePlanningConflicts(filterPlanningConflictsByViewMode(items, mode));
}

export function enrichPlanningConflictItems(
  items: PlanningConflictDto[] | PlanningConflictItem[],
): PlanningConflictItem[] {
  return items.map((item) => ({
    ...item,
    categoryLabel:
      'categoryLabel' in item && item.categoryLabel
        ? item.categoryLabel
        : CATEGORY_LABELS[item.category] ?? CATEGORY_LABELS.other,
  }));
}

export { CATEGORY_LABELS as PLANNING_CONFLICT_CATEGORY_LABELS };

/** 超长单段行驶冲突（road_class / issue-transport-seg-*-long_distance） */
export function isLongDistanceTransportConflict(item: PlanningConflictItem): boolean {
  if (/issue-transport-seg-\d+-long_distance/.test(item.id)) return true;
  if (item.issue?.issueKind === 'road_class') return true;
  const text = `${item.title} ${item.message}`;
  return /超长距离|>\s*\d+\s*km|超过\s*\d+\s*km/i.test(text);
}
