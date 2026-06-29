import {
  buildPlanStudioDecisionProfilingUrl,
  type DecisionProfilingSurface,
} from '@/lib/decision-profiling-navigation';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import type { TripDomain } from '@/types/trip-domain-influence';
import type {
  FeasibilityIssueDto,
  FeasibilityTeamFitCopyVariant,
} from '@/types/trip-feasibility-report';

const TRIP_DOMAINS = new Set<string>([
  'destination_route',
  'main_transport',
  'accommodation',
  'activities',
  'dining',
  'local_transport',
  'shopping',
  'insurance_visa',
]);

const PREFERENCE_LABEL_BY_DOMAIN: Record<string, string> = {
  pacing: '节奏偏好',
  pace: '节奏偏好',
  rhythm: '节奏偏好',
  team_pacing: '节奏偏好',
  team_pacing_pace: '节奏偏好',
  budget: '预算敏感度',
  team_pacing_budget: '预算敏感度',
  experience: '体验优先级',
  fatigue: '安全优先度',
  team_pacing_fatigue: '安全优先度',
  safety: '安全优先度',
};

export interface TeamFitHighlightPlan {
  members: boolean;
  preferences: boolean;
  preferenceLabels: string[];
  coordination: boolean;
  negotiationDomain: TripDomain | null;
  openStructuredNegotiation: boolean;
}

export interface AffectedMemberChip {
  id: string;
  label: string;
}

const TEAM_PACING_KINDS = new Set([
  'team_pacing_pace',
  'team_pacing_budget',
  'team_pacing_fatigue',
  'team_pacing_profiling',
]);

const COPY_VARIANT_HINTS: Record<string, string> = {
  team_friction_pace: '成员对行程紧凑度存在分歧，建议对齐节奏或调整 pace。',
  fatigue_group_capacity: '团队单日强度可能超出承受能力，可考虑拆天或放松节奏。',
  profiling_incomplete: '部分成员尚未完成决策画像，团队适配评估可能不完整。',
};

export function teamFitCopyVariantHint(copyVariant?: FeasibilityTeamFitCopyVariant): string | null {
  if (!copyVariant) return null;
  return COPY_VARIANT_HINTS[copyVariant] ?? null;
}

export function isTeamFitRepairIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.category === 'team_fit') return true;
  if (issue.issueKind && TEAM_PACING_KINDS.has(issue.issueKind)) return true;
  return (
    issue.issueKind === 'profiling_incomplete' ||
    issue.issueKind === 'team_friction' ||
    issue.issueKind === 'team_fatigue'
  );
}

export function buildPlanStudioIntentUrl(tripId: string): string {
  const params = new URLSearchParams();
  params.set('tripId', tripId);
  params.set('openIntent', '1');
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function normalizeTeamFitHighlightDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

/** BFF `uiHints.deepLink.highlightDomains` → 团队 Tab 区块高亮计划 */
export function resolveTeamFitHighlightPlan(domains: string[] | undefined): TeamFitHighlightPlan {
  const normalized = (domains ?? []).map(normalizeTeamFitHighlightDomain).filter(Boolean);
  const preferenceLabels = [
    ...new Set(
      normalized
        .map((d) => PREFERENCE_LABEL_BY_DOMAIN[d])
        .filter((label): label is string => Boolean(label)),
    ),
  ];

  const members = normalized.some((d) =>
    ['members', 'member', 'profiling', 'team_pacing_profiling', 'profiling_incomplete'].includes(d),
  );
  const coordination = normalized.some((d) =>
    ['coordination', 'friction', 'conflict', 'team_friction', 'negotiation'].includes(d),
  );
  const preferences =
    preferenceLabels.length > 0 ||
    normalized.some((d) => ['preferences', 'team_fit', 'team_pacing'].includes(d));

  const negotiationDomain =
    (normalized.find((d) => TRIP_DOMAINS.has(d)) as TripDomain | undefined) ?? null;

  return {
    members,
    preferences,
    preferenceLabels,
    coordination,
    negotiationDomain,
    openStructuredNegotiation: negotiationDomain != null,
  };
}

export function buildTeamFitDeepLinkUrl(tripId: string, issue: FeasibilityIssueDto): string | null {
  const link = issue.uiHints?.deepLink;
  if (!link?.tab) return null;
  if (link.tab === 'team') {
    const params = mergeCollabDeepLink(new URLSearchParams({ tripId, tab: 'schedule' }), {
      collabTab: 'members',
    });
    if (link.highlightDomains?.length) {
      params.set('teamHighlight', link.highlightDomains.join(','));
    }
    if (issue.uiHints?.affectedMemberIds?.length) {
      params.set('teamMembers', issue.uiHints.affectedMemberIds.join(','));
    }
    return `/dashboard/plan-studio?${params.toString()}`;
  }
  const params = new URLSearchParams();
  params.set('tripId', tripId);
  params.set('tab', link.tab);
  if (link.subTab) params.set('subtab', link.subTab);
  if (link.dayIndex != null) params.set('day', String(link.dayIndex + 1));
  if (link.highlightItemIds?.length) {
    params.set('highlightItems', link.highlightItemIds.join(','));
  }
  if (link.highlightDomains?.length) {
    params.set('teamHighlight', link.highlightDomains.join(','));
  }
  if (issue.uiHints?.affectedMemberIds?.length) {
    params.set('teamMembers', issue.uiHints.affectedMemberIds.join(','));
  }
  return `/dashboard/plan-studio?${params.toString()}`;
}

export function resolveAffectedMemberChips(
  memberIds: string[] | undefined,
  nameById?: Record<string, string>,
): AffectedMemberChip[] {
  if (!memberIds?.length) return [];
  return memberIds.map((id) => {
    const name = nameById?.[id]?.trim();
    const label = name || (id.length > 10 ? `成员 · ${id.slice(0, 8)}…` : `成员 · ${id}`);
    return { id, label };
  });
}

export function buildPlanStudioScheduleUrl(tripId: string, dayNumber?: number): string {
  const params = new URLSearchParams({ tab: 'schedule' });
  params.set('tripId', tripId);
  if (dayNumber != null) params.set('day', String(dayNumber));
  return `/dashboard/plan-studio?${params.toString()}`;
}

function profilingSurfaceForIssue(issue: FeasibilityIssueDto): DecisionProfilingSurface {
  const hints = issue.uiHints;
  if (hints?.profilingSurface === 'team_pacing') return 'friction';
  if (issue.issueKind === 'team_pacing_profiling' || issue.issueKind === 'profiling_incomplete') {
    return 'quiz';
  }
  if (issue.issueKind === 'team_pacing_budget') return 'split_consensus';
  return 'friction';
}

function primaryLabelFromUiHints(issue: FeasibilityIssueDto): string {
  const action = issue.uiHints?.primaryAction;
  if (action === 'open_team_pacing') return '调整团队节奏';
  if (action === 'invite_profiling') return '邀请完成画像';
  if (action === 'open_decision_profiling') {
    const surface = issue.uiHints?.profilingSurface;
    if (surface === 'team_pacing') return '调整团队节奏';
    if (issue.issueKind === 'team_pacing_budget') return '对齐预算分摊';
    if (issue.issueKind === 'team_pacing_profiling') return '补做决策画像';
    return '查看团队摩擦';
  }
  return '打开决策画像';
}

/** BFF uiHints.primaryAction 优先 */
export function resolveTeamFitUiHintsAction(
  issue: FeasibilityIssueDto,
  tripId: string,
  options?: { preferPlanStudio?: boolean },
): { label: string; href: string; surface?: DecisionProfilingSurface } | null {
  const hints = issue.uiHints;
  if (!hints?.primaryAction) return null;

  const deepLink = buildTeamFitDeepLinkUrl(tripId, issue);
  const preferPlanStudio = options?.preferPlanStudio ?? false;

  if (hints.primaryAction === 'open_team_pacing' || hints.profilingSurface === 'team_pacing') {
    return {
      label: primaryLabelFromUiHints(issue),
      href: deepLink ?? buildPlanStudioIntentUrl(tripId),
    };
  }

  if (hints.primaryAction === 'invite_profiling') {
    const href = preferPlanStudio
      ? buildPlanStudioDecisionProfilingUrl(tripId, { surface: 'quiz', step: 'travel_style', openQuiz: true })
      : `/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}&openDecisionProfiling=1&decisionProfilingSurface=quiz&decisionProfilingStep=travel_style`;
    return { label: primaryLabelFromUiHints(issue), href, surface: 'quiz' };
  }

  if (hints.primaryAction === 'open_decision_profiling') {
    const surface = profilingSurfaceForIssue(issue);
    const href =
      deepLink ??
      (preferPlanStudio
        ? buildPlanStudioDecisionProfilingUrl(tripId, {
            surface,
            step: surface === 'quiz' ? 'travel_style' : undefined,
            openQuiz: surface === 'quiz',
          })
        : `/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}&openDecisionProfiling=1&decisionProfilingSurface=${surface}`);
    return { label: primaryLabelFromUiHints(issue), href, surface };
  }

  return null;
}

export function shouldOfferPaceAdjustment(issue: FeasibilityIssueDto): boolean {
  if (issue.uiHints?.primaryAction === 'open_team_pacing') return true;
  if (issue.uiHints?.profilingSurface === 'team_pacing') return true;
  if (
    issue.issueKind === 'team_pacing_pace' ||
    issue.issueKind === 'team_pacing_fatigue' ||
    issue.issueKind === 'team_fatigue'
  ) {
    return true;
  }
  if (issue.uiHints?.copyVariant === 'team_friction_pace') return true;
  if (issue.uiHints?.primaryAction === 'open_schedule') return false;
  const text = `${issue.title ?? ''} ${issue.message ?? ''} ${issue.actionRequired ?? ''}`;
  return /节奏|紧凑|pace|疲劳|强度|松散/i.test(text);
}

export function shouldOfferScheduleSplit(issue: FeasibilityIssueDto): boolean {
  const day =
    issue.affectedDays?.[0] ??
    (issue.uiHints?.deepLink?.dayIndex != null ? issue.uiHints.deepLink.dayIndex + 1 : undefined);
  if (day == null) return false;
  if (issue.issueKind === 'team_pacing_fatigue' || issue.issueKind === 'team_fatigue') return true;
  if (issue.uiHints?.copyVariant === 'fatigue_group_capacity') return true;
  return /拆天|拆分|过长|单日/i.test(
    `${issue.title ?? ''} ${issue.message ?? ''} ${issue.actionRequired ?? ''}`,
  );
}

export function resolveTeamFitPrimaryAction(
  issue: FeasibilityIssueDto,
  tripId: string,
  options?: { preferPlanStudio?: boolean },
): { label: string; href: string; surface?: DecisionProfilingSurface } | null {
  return resolveTeamFitUiHintsAction(issue, tripId, options);
}
