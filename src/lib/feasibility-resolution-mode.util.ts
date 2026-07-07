import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import type { FeasibilityIssueDto, FeasibilityResolutionMode } from '@/types/trip-feasibility-report';
import type { FeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';

export function normalizeFeasibilityResolutionMode(
  raw: unknown,
): FeasibilityResolutionMode | undefined {
  const mode = typeof raw === 'string' ? raw : undefined;
  if (
    mode === 'DIRECT_EDIT' ||
    mode === 'AUTO_FIX' ||
    mode === 'EVIDENCE_REFRESH' ||
    mode === 'COLLABORATION' ||
    mode === 'DECISION_REQUIRED'
  ) {
    return mode;
  }
  return undefined;
}

export function isFeasibilityDecisionSpaceIssue(issue: FeasibilityIssueDto): boolean {
  return issue.resolutionMode === 'DECISION_REQUIRED';
}

/** 可执行性 Sheet 内优先队列：DECISION_REQUIRED 由决策空间承接，不在此重复待办 */
export function filterFeasibilityIssuesForActionableInbox(
  issues: FeasibilityIssueDto[],
): FeasibilityIssueDto[] {
  return issues.filter((issue) => !isFeasibilityDecisionSpaceIssue(issue));
}

export function isFeasibilityRepairWorkflowMode(mode: FeasibilityResolutionMode | undefined): boolean {
  return mode === 'AUTO_FIX' || mode == null;
}

export function resolveLinkedDecisionProblemId(issue: FeasibilityIssueDto): string | null {
  const id = issue.linkedDecisionProblemId ?? issue.decisionProblemId;
  return id?.trim() || null;
}

function scheduleHref(tripId: string, issue: FeasibilityIssueDto): string {
  const day =
    issue.affectedDays?.[0] ??
    (issue.uiHints?.deepLink ? issue.uiHints.deepLink.dayIndex + 1 : undefined);
  const params = new URLSearchParams({ tripId, tab: 'schedule' });
  if (day != null) params.set('day', String(day));
  return `/dashboard/plan-studio?${params.toString()}`;
}

/** resolutionMode 优先于启发式 issueKind 路由 */
export function resolveFeasibilityIssueActionByResolutionMode(
  issue: FeasibilityIssueDto,
  tripId: string,
): FeasibilityIssueActionTarget | null {
  const mode = issue.resolutionMode;
  if (!mode) return null;

  switch (mode) {
    case 'DIRECT_EDIT':
      return {
        surface: 'schedule_edit',
        label: '打开时间轴编辑',
        href: scheduleHref(tripId, issue),
        issueId: issue.id,
      };
    case 'AUTO_FIX':
      return {
        surface: 'feasibility_repair',
        label: '一键修复',
        issueId: issue.id,
      };
    case 'EVIDENCE_REFRESH':
      return {
        surface: 'refresh_evidence',
        label: '刷新证据',
        issueId: issue.id,
        forceRefreshEvidence: true,
      };
    case 'COLLABORATION':
      return {
        surface: 'collaboration_center',
        label: '前往协作中心',
        href: buildCollabCenterPlanStudioUrl(tripId, { collabTab: 'persona' }),
        issueId: issue.id,
      };
    case 'DECISION_REQUIRED': {
      const problemId = resolveLinkedDecisionProblemId(issue);
      if (!problemId) {
        return {
          surface: 'decision_space',
          label: '前往决策空间',
          href: `/dashboard/plan-studio?${new URLSearchParams({ tripId, tab: 'schedule', decisionSpace: '1' }).toString()}`,
          issueId: issue.id,
        };
      }
      return {
        surface: 'decision_space',
        label: '前往决策空间',
        href: buildPlanStudioDecisionProblemPath(tripId, problemId),
        issueId: issue.id,
      };
    }
    default:
      return null;
  }
}
