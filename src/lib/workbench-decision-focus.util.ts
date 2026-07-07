import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  buildDecisionCheckerFocusTokens,
  extractDecisionCheckerPoiTokens,
  type DecisionCheckerFocusTokens,
  type DecisionSpaceFocusContext,
} from '@/lib/decision-checker-focus.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { DecisionProblemSummary } from '@/types/decision-problem';

export type WorkbenchDecisionFocusSource =
  | 'none'
  | 'conflict'
  | 'timeline_entry'
  | 'day';

export interface WorkbenchDecisionFocus {
  source: WorkbenchDecisionFocusSource;
  conflictId: string | null;
  problemId: string | null;
  /** 0-based calendar day index */
  dayIndex: number | null;
  timelineEntryId: string | null;
  poiTokens: string[];
  constraintIds: string[];
  title: string | null;
}

export const EMPTY_WORKBENCH_DECISION_FOCUS: WorkbenchDecisionFocus = {
  source: 'none',
  conflictId: null,
  problemId: null,
  dayIndex: null,
  timelineEntryId: null,
  poiTokens: [],
  constraintIds: [],
  title: null,
};

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function tokenMatchesHaystack(token: string, haystack: string): boolean {
  const normalizedToken = normalizeMatchText(token);
  const normalizedHaystack = normalizeMatchText(haystack);
  if (!normalizedToken || normalizedToken.length < 2 || !normalizedHaystack) return false;
  if (normalizedHaystack.includes(normalizedToken)) return true;
  const short = normalizedToken.split(/[（(]/)[0]?.trim();
  return Boolean(short && short.length >= 2 && normalizedHaystack.includes(short));
}

export function collectConflictConstraintIds(conflict: PlanningConflictItem | null | undefined): string[] {
  if (!conflict?.issue?.relatedConstraintIds?.length) return [];
  return conflict.issue.relatedConstraintIds
    .map((id) => apiConstraintIdToUi(id))
    .filter(Boolean);
}

export function buildWorkbenchDecisionFocusFromConflict(input: {
  conflict: PlanningConflictItem;
  problem?: DecisionProblemSummary | null;
  dayIndex: number;
  timelinePois?: string[];
  extraTokens?: string[];
}): WorkbenchDecisionFocus {
  const { conflict, problem, dayIndex, timelinePois = [], extraTokens = [] } = input;
  const focusContext: DecisionSpaceFocusContext = {
    conflict,
    problem: problem ?? null,
    scheduleDayIndex: dayIndex,
    scheduleDayConflicts: [conflict],
    scheduleDayProblems: problem ? [problem] : [],
    scheduleDayExtraTokens: extraTokens,
    scheduleDayTimelinePois: timelinePois,
  };
  const tokens = buildDecisionCheckerFocusTokens(focusContext);

  return {
    source: 'conflict',
    conflictId: conflict.id,
    problemId: problem?.id ?? conflict.issue?.decisionProblemId ?? conflict.issue?.linkedDecisionProblemId ?? null,
    dayIndex,
    timelineEntryId: null,
    poiTokens: tokens.titleTokens,
    constraintIds: collectConflictConstraintIds(conflict),
    title: conflict.title ?? conflict.message ?? null,
  };
}

export function buildWorkbenchDecisionFocusFromTimelineEntry(input: {
  entryId: string;
  dayIndex: number;
  title: string;
  subtitle?: string | null;
}): WorkbenchDecisionFocus {
  const poiTokens = [
    ...extractDecisionCheckerPoiTokens(input.title),
    ...extractDecisionCheckerPoiTokens(input.subtitle),
  ];

  return {
    source: 'timeline_entry',
    conflictId: null,
    problemId: null,
    dayIndex: input.dayIndex,
    timelineEntryId: input.entryId,
    poiTokens: [...new Set(poiTokens)],
    constraintIds: [],
    title: input.title,
  };
}

export function focusTokensFromWorkbenchFocus(
  focus: WorkbenchDecisionFocus,
  input?: {
    conflict?: PlanningConflictItem | null;
    problem?: DecisionProblemSummary | null;
    scheduleDayConflicts?: PlanningConflictItem[];
    scheduleDayProblems?: DecisionProblemSummary[];
    timelinePois?: string[];
    extraTokens?: string[];
  },
): DecisionCheckerFocusTokens {
  if (focus.source === 'none') {
    return { titleTokens: [], dayNumbers: [], refIds: new Set() };
  }

  const focusContext: DecisionSpaceFocusContext = {
    conflict: input?.conflict ?? null,
    problem: input?.problem ?? null,
    scheduleDayIndex: focus.dayIndex ?? undefined,
    scheduleDayConflicts: input?.scheduleDayConflicts,
    scheduleDayProblems: input?.scheduleDayProblems,
    scheduleDayExtraTokens: [...(input?.extraTokens ?? []), ...focus.poiTokens],
    scheduleDayTimelinePois: input?.timelinePois,
  };

  const built = buildDecisionCheckerFocusTokens(focusContext);
  if (focus.conflictId) built.refIds.add(focus.conflictId);
  if (focus.problemId) built.refIds.add(focus.problemId);
  if (focus.timelineEntryId) built.refIds.add(focus.timelineEntryId);
  return built;
}

export function isWorkbenchConstraintEntryFocused(
  entry: Pick<ConstraintListEntry, 'id' | 'label' | 'description' | 'value'>,
  focus: WorkbenchDecisionFocus,
): boolean {
  if (focus.source === 'none') return false;

  const uiId = apiConstraintIdToUi(entry.id);
  if (focus.constraintIds.some((id) => apiConstraintIdToUi(id) === uiId)) {
    return true;
  }

  const haystack = [entry.label, entry.description, entry.value].filter(Boolean).join(' ');
  return focus.poiTokens.some((token) => tokenMatchesHaystack(token, haystack));
}

export function isWorkbenchRouteStopFocused(stopName: string, focus: WorkbenchDecisionFocus): boolean {
  if (focus.source === 'none' || focus.poiTokens.length === 0) return false;
  return focus.poiTokens.some((token) => tokenMatchesHaystack(token, stopName));
}

export function shouldDimWorkbenchRouteStop(stopName: string, focus: WorkbenchDecisionFocus): boolean {
  if (focus.source === 'none' || focus.poiTokens.length === 0) return false;
  return !isWorkbenchRouteStopFocused(stopName, focus);
}

export function conflictAffectsDayIndex(
  conflict: PlanningConflictItem,
  dayIndex: number,
): boolean {
  const dayNumber = dayIndex + 1;
  const days = conflict.affectedDays ?? conflict.issue?.affectedDays;
  if (days?.includes(dayNumber)) return true;
  const haystack = `${conflict.title ?? ''} ${conflict.message ?? ''}`;
  return (
    haystack.includes(`第 ${dayNumber} 天`) ||
    haystack.includes(`第${dayNumber}天`) ||
    haystack.includes(`Day ${dayNumber}`)
  );
}

export function isWorkbenchTimelineEntryHighlighted(
  entry: { title: string; subtitle?: string | null },
  focus: WorkbenchDecisionFocus,
): boolean {
  if (focus.source === 'none' || focus.timelineEntryId) return false;
  const haystack = [entry.title, entry.subtitle].filter(Boolean).join(' ');
  return focus.poiTokens.some((token) => tokenMatchesHaystack(token, haystack));
}

export function reconcileWorkbenchFocusForDayChange(
  focus: WorkbenchDecisionFocus,
  nextDayIndex: number,
  conflicts: PlanningConflictItem[],
): WorkbenchDecisionFocus {
  if (focus.source === 'none') {
    return { ...focus, dayIndex: nextDayIndex };
  }

  if (focus.conflictId) {
    const conflict = conflicts.find((item) => item.id === focus.conflictId);
    if (conflict && conflictAffectsDayIndex(conflict, nextDayIndex)) {
      return { ...focus, dayIndex: nextDayIndex, timelineEntryId: null };
    }
  }

  if (focus.source === 'timeline_entry') {
    return EMPTY_WORKBENCH_DECISION_FOCUS;
  }

  return {
    ...EMPTY_WORKBENCH_DECISION_FOCUS,
    source: 'day',
    dayIndex: nextDayIndex,
  };
}
