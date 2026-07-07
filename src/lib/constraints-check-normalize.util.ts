import { apiConstraintIdToUi, uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import { softApiPriorityToSolverWeight } from '@/lib/soft-constraint-solver.util';
import type {
  TripConstraintsCheckIssue,
  TripConstraintsCheckResponse,
  TripConstraintsSoftTradeoff,
} from '@/types/trip-constraints';

/** 约束 id 别名（c_tpl_* / ui id / c_*） */
export function expandConstraintIdVariants(id: string): string[] {
  const trimmed = id.trim();
  if (!trimmed) return [];
  const variants = new Set<string>([trimmed]);
  variants.add(apiConstraintIdToUi(trimmed));
  variants.add(uiConstraintIdToApi(trimmed));
  if (trimmed.startsWith('c_')) variants.add(trimmed.slice(2));
  if (trimmed.startsWith('c_tpl_')) variants.add(trimmed.slice(6));
  return [...variants];
}

export function collectIssueConstraintIds(issue: TripConstraintsCheckIssue): string[] {
  const ids = new Set<string>();
  if (issue.constraintId?.trim()) {
    for (const v of expandConstraintIdVariants(issue.constraintId)) ids.add(v);
  }
  for (const raw of issue.relatedConstraintIds ?? []) {
    if (!raw?.trim()) continue;
    for (const v of expandConstraintIdVariants(raw)) ids.add(v);
  }
  return [...ids];
}

export function collectSacrificedConstraintIds(
  response: Pick<
    TripConstraintsCheckResponse,
    'sacrificedConstraintIds' | 'softTradeoffs' | 'issues'
  >,
): Set<string> {
  const ids = new Set<string>();
  const add = (raw?: string | null) => {
    if (!raw?.trim()) return;
    for (const v of expandConstraintIdVariants(raw)) ids.add(v);
  };

  for (const id of response.sacrificedConstraintIds ?? []) add(id);
  for (const tradeoff of response.softTradeoffs ?? []) {
    if (tradeoff.sacrificed === false) continue;
    add(tradeoff.constraintId);
  }
  for (const issue of response.issues ?? []) {
    if (issue.sacrificed || issue.issueKind === 'soft_tradeoff') {
      for (const id of collectIssueConstraintIds(issue)) ids.add(id);
    }
  }
  return ids;
}

export function isScheduleAdvisoryIssue(issue: TripConstraintsCheckIssue): boolean {
  if (issue.issueKind === 'soft_tradeoff') return false;
  return issue.severity === 'suggest_adjust';
}

/** 被 trade-off 牺牲的低优先级 SOFT 项：不再重复展示日程 suggest_adjust violation */
export function shouldSuppressScheduleViolationForSacrifice(
  issue: TripConstraintsCheckIssue,
  sacrificedIds: Set<string>,
): boolean {
  if (!isScheduleAdvisoryIssue(issue)) return false;
  const related = collectIssueConstraintIds(issue);
  return related.some((id) => sacrificedIds.has(id));
}

function tradeoffToIssue(tradeoff: TripConstraintsSoftTradeoff): TripConstraintsCheckIssue {
  return {
    id: tradeoff.constraintId
      ? `soft_tradeoff_${tradeoff.constraintId}`
      : `soft_tradeoff_${tradeoff.templateId ?? 'unknown'}`,
    constraintId: tradeoff.constraintId,
    issueKind: 'soft_tradeoff',
    sacrificed: true,
    severity: 'suggest_adjust',
    templateId: tradeoff.templateId,
    solverWeight: tradeoff.solverWeight ?? softApiPriorityToSolverWeight(tradeoff.priority),
    message:
      tradeoff.message?.trim() ||
      '为兼顾更高优先级偏好，此项已在本次方案中适度放宽。',
    allowRelaxation: true,
  };
}

function mergeSoftTradeoffsIntoIssues(
  issues: TripConstraintsCheckIssue[],
  tradeoffs: TripConstraintsSoftTradeoff[] | undefined,
): TripConstraintsCheckIssue[] {
  if (!tradeoffs?.length) return issues;

  const covered = new Set<string>();
  for (const issue of issues) {
    if (issue.issueKind !== 'soft_tradeoff' && !issue.sacrificed) continue;
    for (const id of collectIssueConstraintIds(issue)) covered.add(id);
  }

  const merged = [...issues];
  for (const tradeoff of tradeoffs) {
    if (tradeoff.sacrificed === false) continue;
    const variants = expandConstraintIdVariants(tradeoff.constraintId);
    if (variants.some((id) => covered.has(id))) continue;
    const issue = tradeoffToIssue(tradeoff);
    merged.push(issue);
    for (const id of collectIssueConstraintIds(issue)) covered.add(id);
  }
  return merged;
}

function recountCheckSummary(issues: TripConstraintsCheckIssue[]) {
  const mustHandle = issues.filter((i) => i.severity === 'must_handle').length;
  const suggestAdjust = issues.filter((i) => i.severity === 'suggest_adjust').length;
  const pendingConfirm = issues.filter((i) => i.severity === 'pending_confirm').length;
  return {
    mustHandle,
    suggestAdjust,
    pendingConfirm,
    total: issues.length,
  };
}

/**
 * POST /check 响应归一化：
 * - 合并 softTradeoffs 与 issues（日程 advisory + trade-off 牺牲）
 * - 过滤被牺牲项的重复 suggest_adjust 日程 violation
 */
export function normalizeConstraintsCheckResponse(
  raw: TripConstraintsCheckResponse,
): TripConstraintsCheckResponse {
  const sacrificedIds = collectSacrificedConstraintIds(raw);
  const filtered = (raw.issues ?? []).filter(
    (issue) => !shouldSuppressScheduleViolationForSacrifice(issue, sacrificedIds),
  );
  const issues = mergeSoftTradeoffsIntoIssues(filtered, raw.softTradeoffs);
  const counts = recountCheckSummary(issues);

  const apiSacrificedIds = [...sacrificedIds].filter((id) => id.startsWith('c_'));

  return {
    ...raw,
    issues,
    sacrificedConstraintIds: apiSacrificedIds.length
      ? apiSacrificedIds
      : raw.sacrificedConstraintIds,
    mustHandle: counts.mustHandle,
    suggestAdjust: counts.suggestAdjust,
    pendingConfirm: counts.pendingConfirm,
    summary: raw.summary
      ? { ...raw.summary, ...counts }
      : {
          mustHandle: counts.mustHandle,
          suggestAdjust: counts.suggestAdjust,
          total: counts.total,
        },
  };
}
