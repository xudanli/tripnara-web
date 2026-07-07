import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { isLongDistanceTransportConflict } from '@/lib/planning-conflicts.util';
import { isOpenDecisionProblem } from '@/lib/decision-center.util';
import { resolveDecisionProblemId } from '@/lib/decision-problem-enforcement.util';
import {
  isGateOnlyProblem,
  resolveSourceRefId,
  resolveTripConstraintRefId,
} from '@/lib/decision-problem-display.util';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import { resolveConstraintUiIdsForEnforcementIssueKind } from '@/lib/trip-constraint-hard-enforcement.util';
import type { PlanStudioConflict } from '@/types/trip';

export function buildDecisionProblemByIdMap(
  items: DecisionProblemSummary[],
): Map<string, DecisionProblemSummary> {
  return new Map(items.map((item) => [item.id, item]));
}

export function resolveDecisionProblemForConflict(
  conflict: PlanningConflictItem | null | undefined,
  decisionProblems: DecisionProblemSummary[],
): DecisionProblemSummary | undefined {
  if (!conflict || decisionProblems.length === 0) return undefined;
  const byId = buildDecisionProblemByIdMap(decisionProblems);

  const fromIssue = conflict.issue ? resolveDecisionProblemId(conflict.issue) : undefined;
  if (fromIssue && byId.has(fromIssue)) return byId.get(fromIssue);

  if (byId.has(conflict.id)) return byId.get(conflict.id);

  const issueRef = conflict.issue?.id;
  return decisionProblems.find((problem) => {
    const refs = problem.sourceRefs ?? [];
    return refs.some(
      (ref) =>
        ref.refId === conflict.id ||
        ref.refId === issueRef ||
        ref.refId === conflict.semanticKey,
    );
  });
}

export function resolveConflictForDecisionProblem(
  problem: DecisionProblemSummary,
  conflicts: PlanningConflictItem[],
): PlanningConflictItem | undefined {
  const byId = new Map(conflicts.map((item) => [item.id, item]));
  if (byId.has(problem.id)) return byId.get(problem.id);

  for (const ref of problem.sourceRefs ?? []) {
    const refId = ref.refId;
    const match = conflicts.find(
      (item) =>
        item.id === refId ||
        item.issue?.id === refId ||
        item.semanticKey === refId,
    );
    if (match) return match;
  }

  const feasibilityRefId = resolveSourceRefId(problem, 'FEASIBILITY');
  if (feasibilityRefId) {
    const match = conflicts.find(
      (item) => item.id === feasibilityRefId || item.issue?.id === feasibilityRefId,
    );
    if (match) return match;
  }

  const problemDays = new Set(problem.affectedDayNumbers ?? []);
  const titleHaystack = [
    problem.title,
    problem.affectedScopeSummary,
    problem.semanticKey,
  ]
    .filter(Boolean)
    .join(' ');

  if (/交通缓冲|缓冲偏|缓冲不足|travel_buffer|same_day_travel/i.test(titleHaystack)) {
    return conflicts.find((item) => {
      const conflictHaystack = [
        item.title,
        item.message,
        item.issue?.title,
        item.issue?.message,
        item.studioConflict?.type,
        item.issue?.conflictType,
        item.issue?.issueKind,
      ]
        .filter(Boolean)
        .join(' ');
      const isBufferLike =
        item.studioConflict?.type === 'BUFFER_INSUFFICIENT' ||
        item.issue?.conflictType === 'BUFFER_INSUFFICIENT' ||
        /交通缓冲|缓冲偏|buffer/i.test(conflictHaystack) ||
        item.issue?.issueKind === 'same_day_travel';
      if (!isBufferLike) return false;
      if (problemDays.size === 0) return true;
      const conflictDays = new Set([
        ...(item.affectedDays ?? []),
        ...(item.issue?.affectedDays ?? []),
      ]);
      for (const day of problemDays) {
        if (conflictDays.has(day)) return true;
      }
      return false;
    });
  }

  return undefined;
}

export function resolveActiveDecisionProblem(
  activeProblemId: string | null | undefined,
  conflict: PlanningConflictItem | null | undefined,
  decisionProblems: DecisionProblemSummary[],
): DecisionProblemSummary | undefined {
  const byId = buildDecisionProblemByIdMap(decisionProblems);
  if (activeProblemId && byId.has(activeProblemId)) return byId.get(activeProblemId);
  return resolveDecisionProblemForConflict(conflict, decisionProblems);
}

export function listOpenDecisionProblems(
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  return items.filter(isOpenDecisionProblem);
}

export function resolveConflictPrimaryEnforcement(
  item: PlanningConflictItem,
  decisionProblemById?: Map<string, DecisionProblemSummary>,
): string | undefined {
  const issue = item.issue;
  if (!issue || !decisionProblemById?.size) return undefined;
  const problemId = resolveDecisionProblemId(issue);
  return decisionProblemById.get(problemId)?.primaryEnforcement;
}

export function conflictCardAccentFromEnforcement(
  _item: PlanningConflictItem,
  _decisionProblemById?: Map<string, DecisionProblemSummary>,
): string {
  return '';
}

function addRelatedConstraintUiId(ids: Set<string>, ref: string | undefined): void {
  if (!ref?.trim()) return;
  ids.add(apiConstraintIdToUi(ref.trim()));
}

function relatedIdsFromIssueKind(issueKind: string | undefined): string[] {
  const enforced = resolveConstraintUiIdsForEnforcementIssueKind(issueKind);
  if (enforced.length > 0) return enforced;

  switch (issueKind) {
    case 'road_class':
      return ['max_segment_distance', 'transport'];
    case 'inter_day_travel':
    case 'same_day_travel':
      return ['daily_drive', 'transport', 'time_range', 'pacing'];
    case 'buffer_insufficient':
      return ['daily_drive', 'time_range', 'transport', 'pacing'];
    case 'team_fatigue':
      return ['daily_drive', 'pacing'];
    default:
      return [];
  }
}

function relatedIdsFromIssueConflictType(conflictType: string | undefined): string[] {
  switch (conflictType) {
    case 'BUFFER_INSUFFICIENT':
      return ['daily_drive', 'time_range', 'transport', 'pacing'];
    case 'TRANSPORT_TOO_LONG':
    case 'TRANSPORT_INSUFFICIENT':
      return ['daily_drive', 'transport', 'max_segment_distance'];
    case 'FATIGUE_EXCEEDED':
      return ['daily_drive', 'pacing'];
    case 'TIME_CONFLICT':
      return ['daily_drive', 'time_range'];
    default:
      return [];
  }
}

/** BFF 决策问题无关联 conflict 时，从标题/语义键推断约束 UI id */
function relatedIdsFromDecisionProblem(
  problem: DecisionProblemSummary | null | undefined,
): string[] {
  if (!problem) return [];

  const haystack = [
    problem.title,
    problem.semanticKey,
    problem.id,
    problem.affectedScopeSummary,
    problem.impactScopeHeadline,
  ]
    .filter(Boolean)
    .join(' ');

  if (
    /交通缓冲|缓冲偏|缓冲不足|转场缓冲/u.test(haystack) ||
    /travel_buffer|same_day_travel|buffer_insufficient|BUFFER_INSUFFICIENT/i.test(haystack)
  ) {
    return ['daily_drive', 'time_range', 'transport', 'pacing'];
  }
  if (/长距离|驾驶超时|road_class|segment/i.test(haystack)) {
    return ['max_segment_distance', 'daily_drive', 'transport'];
  }
  if (/节奏|疲劳|fatigue|team_fatigue/i.test(haystack)) {
    return ['pacing', 'daily_drive'];
  }
  if (/开门|营业|opening_hours/i.test(haystack)) {
    return ['time_range', 'pacing'];
  }
  if (/住宿|accommodation/i.test(haystack)) {
    return ['accommodation', 'budget'];
  }
  if (/预算|budget/i.test(haystack)) {
    return ['budget'];
  }
  if (/必去|must_go|must go/i.test(haystack)) {
    return ['must_go'];
  }

  return [];
}

function relatedIdsFromIssueCategory(category: string | undefined): string[] {
  switch (category) {
    case 'transport':
      return ['transport', 'daily_drive'];
    case 'schedule':
      return ['daily_drive', 'time_range'];
    case 'team_fit':
      return ['pacing', 'daily_drive'];
    case 'itinerary_completeness':
      return ['must_go', 'planning_policy'];
    default:
      return [];
  }
}

function relatedIdsFromStudioConflictType(
  type: PlanStudioConflict['type'] | undefined,
): string[] {
  switch (type) {
    case 'TRANSPORT_TOO_LONG':
    case 'TRANSPORT_INSUFFICIENT':
      return ['daily_drive', 'transport', 'max_segment_distance'];
    case 'FATIGUE_EXCEEDED':
      return ['daily_drive', 'pacing'];
    case 'TIME_CONFLICT':
    case 'BUFFER_INSUFFICIENT':
      return ['daily_drive', 'time_range', 'transport', 'pacing'];
    case 'ACCESSIBILITY_MISMATCH':
      return ['travelers', 'pacing'];
    default:
      return [];
  }
}

/** 决策空间左栏：当前冲突/决策问题关联的约束 UI id（只读展示，不含全部约束） */
export function resolveRelatedConstraintUiIds(input: {
  conflict?: PlanningConflictItem | null;
  decisionProblem?: DecisionProblemSummary | null;
}): string[] {
  if (isGateOnlyProblem(input.decisionProblem)) return [];

  const ids = new Set<string>();

  const constraintRef = resolveTripConstraintRefId(input.decisionProblem);
  if (constraintRef) addRelatedConstraintUiId(ids, constraintRef);

  const semanticKey = input.decisionProblem?.semanticKey;
  if (semanticKey?.startsWith('constraint:')) {
    addRelatedConstraintUiId(ids, semanticKey.slice('constraint:'.length));
  }

  const issue = input.conflict?.issue;
  if (issue) {
    for (const id of relatedIdsFromIssueKind(issue.issueKind)) ids.add(id);
    for (const id of relatedIdsFromIssueConflictType(issue.conflictType)) ids.add(id);
    for (const id of relatedIdsFromIssueCategory(String(issue.category))) ids.add(id);
    for (const proof of issue.proofs ?? []) {
      addRelatedConstraintUiId(ids, proof.constraint);
    }
  }

  for (const id of relatedIdsFromDecisionProblem(input.decisionProblem)) {
    ids.add(id);
  }

  const conflict = input.conflict;
  if (conflict) {
    for (const id of relatedIdsFromStudioConflictType(conflict.studioConflict?.type)) {
      ids.add(id);
    }
    if (isLongDistanceTransportConflict(conflict)) {
      ids.add('max_segment_distance');
    }
    if (conflict.category === 'transport') {
      ids.add('transport');
      ids.add('daily_drive');
    }
  }

  return [...ids];
}
