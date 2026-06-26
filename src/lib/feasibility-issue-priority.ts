import type { ScoreFinding, ScoreRisk } from '@/api/readiness';
import type {
  FeasibilityIssueAnchorsDto,
  FeasibilityIssueDto,
  FeasibilityIssueKind,
  FeasibilityIssuePriority,
  FeasibilityVerdictStatus,
} from '@/types/trip-feasibility-report';

const PRIORITY_RANK: Record<FeasibilityIssuePriority, number> = {
  must_handle: 3,
  suggest_adjust: 2,
  pending_confirm: 1,
};

function maxPriority(
  ...priorities: Array<FeasibilityIssuePriority | null | undefined>
): FeasibilityIssuePriority {
  let best: FeasibilityIssuePriority = 'pending_confirm';
  for (const p of priorities) {
    if (p && PRIORITY_RANK[p] > PRIORITY_RANK[best]) best = p;
  }
  return best;
}

/** Readiness findings → issues[].priority（severity 不单独升格） */
export function mapReadinessFindingPriority(finding: ScoreFinding): FeasibilityIssuePriority {
  if (finding.type === 'blocker') return 'must_handle';
  if (finding.type === 'must' || finding.type === 'warning') return 'suggest_adjust';
  if (finding.type === 'should' || finding.type === 'suggestion') return 'pending_confirm';
  if (finding.type === 'optional') return 'pending_confirm';
  return 'pending_confirm';
}

function isTravelTimingIssue(issueKind?: FeasibilityIssueKind): boolean {
  return issueKind === 'inter_day_travel' || issueKind === 'same_day_travel';
}

/** 交通衔接 / 时刻锚点 → priority */
export function mapTravelTimingPriority(
  anchors?: FeasibilityIssueAnchorsDto,
  issueKind?: FeasibilityIssueKind,
): FeasibilityIssuePriority | null {
  if (!anchors && !isTravelTimingIssue(issueKind)) return null;
  if (!anchors) return null;

  if (anchors.timingSource === 'missing_times') return 'pending_confirm';

  const isStartTooEarly =
    anchors.isStartTooEarly ?? (anchors.gapMinutes != null && anchors.gapMinutes < -5);
  if (isStartTooEarly) return 'must_handle';

  if (anchors.gapMinutes != null && anchors.gapMinutes <= 30) return 'suggest_adjust';

  return null;
}

/** Conflicts → issues[].priority */
export function mapConflictPriority(input: {
  conflictType?: string | null;
  severity?: 'high' | 'medium' | 'low' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  anchors?: FeasibilityIssueAnchorsDto;
  issueKind?: FeasibilityIssueKind;
}): FeasibilityIssuePriority | null {
  const conflictType = input.conflictType?.toUpperCase();
  if (conflictType === 'CLOSURE_RISK' || conflictType === 'TRANSPORT_INSUFFICIENT') {
    return 'must_handle';
  }

  const timing = mapTravelTimingPriority(input.anchors, input.issueKind);
  if (timing) return timing;

  if (!conflictType) return null;

  const severity = input.severity?.toLowerCase();
  if (severity === 'high') return 'must_handle';
  if (severity === 'medium') return 'suggest_adjust';

  return null;
}

/** 合并 readiness + conflict 信号；显式 priority 优先 */
export function resolveFindingPriority(finding: ScoreFinding): FeasibilityIssuePriority {
  if (finding.priority) return finding.priority;

  return maxPriority(
    mapReadinessFindingPriority(finding),
    mapConflictPriority({
      conflictType: finding.conflictType,
      severity: finding.severity,
      anchors: finding.anchors,
      issueKind: finding.issueKind,
    }),
  );
}

/** 已组装 issue：显式 priority 与 conflict / timing 信号取较高档 */
export function resolveIssuePriority(issue: FeasibilityIssueDto): FeasibilityIssuePriority {
  return maxPriority(
    issue.priority,
    mapConflictPriority({
      conflictType: issue.conflictType,
      severity: issue.severity,
      anchors: issue.anchors,
      issueKind: issue.issueKind,
    }),
  );
}

/** 环境风险：severity 不单独升格为 must_handle（P1 天气等 → suggest / pending） */
export function mapRiskPriority(risk: ScoreRisk): FeasibilityIssuePriority {
  if (risk.severity === 'low') return 'pending_confirm';
  return 'suggest_adjust';
}

export interface FeasibilityIssueSummaryCounts {
  mustHandle: number;
  suggestAdjust: number;
  pendingConfirm: number;
}

export function countIssuePriorities(issues: FeasibilityIssueDto[]): FeasibilityIssueSummaryCounts {
  return {
    mustHandle: issues.filter((i) => i.priority === 'must_handle').length,
    suggestAdjust: issues.filter((i) => i.priority === 'suggest_adjust').length,
    pendingConfirm: issues.filter((i) => i.priority === 'pending_confirm').length,
  };
}

/** Verdict 门控：基于 issues summary，而非 readiness summary 原始计数 */
export function resolveVerdictFromSummary(
  summary: FeasibilityIssueSummaryCounts,
  options?: { hasValidatedReport?: boolean; isStale?: boolean },
): { status: FeasibilityVerdictStatus; headline: string } {
  if (options?.hasValidatedReport === false) {
    return { status: 'UNKNOWN', headline: '尚未完成验证' };
  }
  if (options?.isStale) {
    return { status: 'STALE', headline: '报告已过期' };
  }

  if (summary.mustHandle > 0) {
    return { status: 'NOT_EXECUTABLE', headline: '当前方案暂不可执行' };
  }
  if (summary.suggestAdjust > 0 || summary.pendingConfirm > 0) {
    return { status: 'ADJUST_REQUIRED', headline: '当前方案基本可行，需要调整' };
  }
  return { status: 'EXECUTABLE', headline: '当前方案可执行' };
}
