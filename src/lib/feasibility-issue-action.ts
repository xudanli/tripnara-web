import {
  buildFeasibilityDecisionProfilingUrl,
  buildPlanStudioDecisionProfilingUrl,
  type DecisionProfilingSurface,
} from '@/lib/decision-profiling-navigation';
import {
  resolveFeasibilityIssueActionByResolutionMode,
} from '@/lib/feasibility-resolution-mode.util';
import { resolveFeasibilityIssueVisualCategory } from '@/lib/feasibility-issue-display';
import {
  isEnforcedHardConstraintIssueKind,
  resolveConstraintUiIdsForEnforcementIssueKind,
} from '@/lib/trip-constraint-hard-enforcement.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';

export type FeasibilityIssueActionSurface =
  | 'decision_profiling_quiz'
  | 'decision_profiling_reuse'
  | 'friction_radar'
  | 'split_consensus'
  | 'team_style_wall'
  | 'schedule_edit'
  | 'feasibility_repair'
  | 'road_class_repair'
  | 'refresh_evidence'
  | 'decision_space'
  | 'collaboration_center'
  | 'issue_detail';

export interface FeasibilityIssueActionTarget {
  surface: FeasibilityIssueActionSurface;
  label: string;
  href?: string;
  issueId?: string;
  profilingSurface?: DecisionProfilingSurface;
  profilingStep?: DecisionProfilingStep;
  forceRefreshEvidence?: boolean;
  /** 在报告内筛选 issue 列表 */
  categoryFilter?: string;
}

function ruleIdHints(issue: FeasibilityIssueDto): string {
  return (issue.proofs ?? [])
    .map((proof) => proof.ruleId ?? '')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function issueText(issue: FeasibilityIssueDto): string {
  return `${issue.title ?? ''} ${issue.message ?? ''} ${issue.actionRequired ?? ''}`.toLowerCase();
}

function isTeamFitIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.category === 'team_fit') return true;
  return (
    issue.issueKind === 'profiling_incomplete' ||
    issue.issueKind === 'team_friction' ||
    issue.issueKind === 'team_fatigue'
  );
}

function hasBudgetSplitFriction(issue: FeasibilityIssueDto): boolean {
  const rules = ruleIdHints(issue);
  if (/split|money_dna|budget\.|分摊/.test(rules)) return true;
  return /预算|分摊|共识|aa\b|split/i.test(issueText(issue));
}

function profilingTarget(
  tripId: string,
  surface: DecisionProfilingSurface,
  label: string,
  step?: DecisionProfilingStep,
  actionSurface?: FeasibilityIssueActionSurface,
): FeasibilityIssueActionTarget {
  return {
    surface: actionSurface ?? 'decision_profiling_quiz',
    label,
    href: buildFeasibilityDecisionProfilingUrl(tripId, { surface, step }),
    profilingSurface: surface,
    profilingStep: step,
    categoryFilter: 'team_fit',
  };
}

function scheduleHref(tripId: string, issue: FeasibilityIssueDto): string {
  const day =
    issue.affectedDays?.[0] ??
    (issue.uiHints?.deepLink ? issue.uiHints.deepLink.dayIndex + 1 : undefined);
  const params = new URLSearchParams({ tab: 'schedule' });
  if (day != null) params.set('day', String(day));
  return `/dashboard/trips/${encodeURIComponent(tripId)}/plan-studio?${params.toString()}`;
}

/**
 * 按 issueKind / category / uiHints / proofs 决定 CTA 与落地 surface。
 * team_fit 走 decision-profiling，不走 feasibility repair 为主路径。
 */
export function resolveFeasibilityIssueActionTarget(
  issue: FeasibilityIssueDto,
  tripId: string,
  options?: { preferPlanStudio?: boolean },
): FeasibilityIssueActionTarget {
  const byMode = resolveFeasibilityIssueActionByResolutionMode(issue, tripId);
  if (byMode) return byMode;

  const preferPlanStudio = options?.preferPlanStudio ?? false;
  const profilingUrl = (surface: DecisionProfilingSurface, step?: DecisionProfilingStep) =>
    preferPlanStudio
      ? buildPlanStudioDecisionProfilingUrl(tripId, { surface, step, openQuiz: surface === 'quiz' })
      : buildFeasibilityDecisionProfilingUrl(tripId, { surface, step });

  if (isTeamFitIssue(issue)) {
    if (issue.issueKind === 'profiling_incomplete') {
      return {
        ...profilingTarget(tripId, 'quiz', '补做决策画像', 'travel_style'),
        href: profilingUrl('quiz', 'travel_style'),
      };
    }
    if (hasBudgetSplitFriction(issue)) {
      return {
        ...profilingTarget(tripId, 'split_consensus', '对齐预算分摊'),
        href: profilingUrl('split_consensus'),
        surface: 'split_consensus',
      };
    }
    if (issue.issueKind === 'team_friction' || /摩擦|风格/.test(issueText(issue))) {
      return {
        ...profilingTarget(tripId, 'friction', '查看团队摩擦'),
        href: profilingUrl('friction'),
        surface: 'friction_radar',
      };
    }
    if (issue.issueKind === 'team_fatigue') {
      return {
        ...profilingTarget(tripId, 'friction', '查看疲劳与节奏'),
        href: profilingUrl('friction'),
        surface: 'friction_radar',
      };
    }
    return {
      ...profilingTarget(tripId, 'hub', '打开决策画像'),
      href: profilingUrl('hub'),
    };
  }

  if (issue.issueKind && isEnforcedHardConstraintIssueKind(issue.issueKind)) {
    const constraintId =
      resolveConstraintUiIdsForEnforcementIssueKind(issue.issueKind)[0] ?? issue.issueKind;
    const params = new URLSearchParams({
      tripId,
      tab: 'schedule',
      view: 'constraints',
      constraintId,
    });
    const label =
      issue.issueKind === 'budget'
        ? '调整预算约束'
        : issue.issueKind === 'no_night_drive'
          ? '调整不夜驾约束'
          : '调整驾驶上限';
    return {
      surface: 'decision_space',
      label,
      href: `/dashboard/plan-studio?${params.toString()}`,
      issueId: issue.id,
      categoryFilter: resolveFeasibilityIssueVisualCategory(issue),
    };
  }

  if (
    issue.uiHints?.primaryAction === 'open_repair' ||
    issue.issueKind === 'road_class' ||
    ruleIdHints(issue).includes('transport.road')
  ) {
    if (preferPlanStudio) {
      const params = new URLSearchParams({
        tripId,
        tab: 'schedule',
        view: 'constraints',
        constraintId: 'max_segment_distance',
      });
      return {
        surface: 'road_class_repair',
        label: '调整单段距离',
        href: `/dashboard/plan-studio?${params.toString()}`,
        issueId: issue.id,
        categoryFilter: resolveFeasibilityIssueVisualCategory(issue),
      };
    }
    return {
      surface: 'road_class_repair',
      label: '查看路段修复方案',
      issueId: issue.id,
      categoryFilter: resolveFeasibilityIssueVisualCategory(issue),
    };
  }

  if (issue.uiHints?.primaryAction === 'adjust_time') {
    return {
      surface: 'feasibility_repair',
      label: '调整时间',
      issueId: issue.id,
      categoryFilter: resolveFeasibilityIssueVisualCategory(issue),
    };
  }

  if (
    issue.uiHints?.primaryAction === 'open_schedule' ||
    issue.issueKind === 'itinerary_structure' ||
    issue.category === 'itinerary_completeness'
  ) {
    return {
      surface: 'schedule_edit',
      label: '去时间轴调整',
      href: scheduleHref(tripId, issue),
      categoryFilter: 'itinerary_completeness',
    };
  }

  if (
    issue.issueKind === 'opening_hours' ||
    issue.category === 'booking' ||
    /证据|营业|开放/.test(issueText(issue))
  ) {
    return {
      surface: 'refresh_evidence',
      label: '刷新 POI 证据',
      issueId: issue.id,
      forceRefreshEvidence: true,
      categoryFilter: issue.category,
    };
  }

  if (
    issue.issueKind === 'inter_day_travel' ||
    issue.issueKind === 'same_day_travel' ||
    issue.category === 'transport' ||
    issue.category === 'schedule'
  ) {
    return {
      surface: 'schedule_edit',
      label: '去日程调整',
      href: scheduleHref(tripId, issue),
      categoryFilter: issue.category,
    };
  }

  return {
    surface: 'feasibility_repair',
    label: '查看修复选项',
    issueId: issue.id,
    categoryFilter: resolveFeasibilityIssueVisualCategory(issue),
  };
}
