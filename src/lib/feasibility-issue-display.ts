import {
  Activity,
  ArrowRightLeft,
  BedDouble,
  CalendarDays,
  Car,
  ClipboardList,
  CloudSun,
  DoorOpen,
  ListTree,
  Route,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import { feasibilityDimensionLabel } from '@/lib/feasibility-dimension-display';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

export interface FeasibilityIssueAction {
  label: string;
  href: string;
}

export function feasibilityIssueCategoryLabel(issue: FeasibilityIssueDto): string | null {
  const category = String(issue.category ?? '');
  if (category === 'team_fit') return '团队适配';
  if (category === 'itinerary_completeness') return '行程结构';
  const fromKey = feasibilityDimensionLabel(category);
  if (fromKey !== category) return fromKey;
  return null;
}

function isTeamFitIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.category === 'team_fit') return true;
  return (
    issue.issueKind === 'profiling_incomplete' ||
    issue.issueKind === 'team_friction' ||
    issue.issueKind === 'team_fatigue'
  );
}

function isItineraryStructureIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.category === 'itinerary_completeness') return true;
  return issue.issueKind === 'itinerary_structure';
}

export function resolveFeasibilityIssueAction(
  issue: FeasibilityIssueDto,
  tripId: string,
  options?: { preferPlanStudio?: boolean },
): FeasibilityIssueAction | null {
  const target = resolveFeasibilityIssueActionTarget(issue, tripId, options);
  if (target.href) {
    return { label: target.label, href: target.href };
  }
  if (
    target.surface === 'feasibility_repair' ||
    target.surface === 'road_class_repair' ||
    target.surface === 'refresh_evidence'
  ) {
    return { label: target.label, href: `#issue-${issue.id}` };
  }
  return null;
}

export function feasibilityIssueKindHint(issue: FeasibilityIssueDto): string | null {
  switch (issue.issueKind) {
    case 'profiling_incomplete':
      return '部分成员尚未完成决策画像，团队适配分可能偏低。';
    case 'team_friction':
      return '成员旅行风格存在摩擦，建议行前对齐预期。';
    case 'team_fatigue':
      return '团队整体疲劳风险偏高，与单日节奏或驾驶强度相关。';
    case 'itinerary_structure':
      return '行程结构信号（如缺餐、重复 POI、路段阻断）需在同一视图下调整。';
    default:
      return null;
  }
}

export type FeasibilityIssueVisualCategory =
  | 'team_fit'
  | 'itinerary_completeness'
  | 'schedule'
  | 'transport'
  | 'booking'
  | 'environment'
  | 'generic';

function ruleIdHints(issue: FeasibilityIssueDto): string {
  return (issue.proofs ?? [])
    .map((proof) => proof.ruleId ?? '')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function resolveFeasibilityIssueVisualCategory(
  issue: FeasibilityIssueDto,
): FeasibilityIssueVisualCategory {
  if (isTeamFitIssue(issue)) return 'team_fit';
  if (isItineraryStructureIssue(issue)) return 'itinerary_completeness';

  switch (issue.issueKind) {
    case 'inter_day_travel':
    case 'same_day_travel':
    case 'road_class':
      return 'transport';
    case 'opening_hours':
      return 'schedule';
    default:
      break;
  }

  const category = String(issue.category ?? '');
  if (
    category === 'team_fit' ||
    category === 'itinerary_completeness' ||
    category === 'schedule' ||
    category === 'transport' ||
    category === 'booking' ||
    category === 'environment'
  ) {
    return category;
  }

  const rules = ruleIdHints(issue);
  if (rules.includes('team.') || rules.includes('profiling')) return 'team_fit';
  if (
    rules.includes('itinerary.') ||
    rules.includes('meal') ||
    rules.includes('duplicate') ||
    rules.includes('structure')
  ) {
    return 'itinerary_completeness';
  }
  if (rules.includes('schedule.travel_time') || rules.includes('opening')) return 'schedule';
  if (rules.includes('booking.')) return 'booking';
  if (rules.includes('environment.') || rules.includes('weather')) return 'environment';
  if (rules.includes('transport.') || rules.includes('road')) return 'transport';

  return 'generic';
}

export function getFeasibilityIssueIcon(issue: FeasibilityIssueDto): LucideIcon {
  switch (issue.issueKind) {
    case 'profiling_incomplete':
      return ClipboardList;
    case 'team_friction':
    case 'team_fatigue':
      return issue.issueKind === 'team_fatigue' ? Activity : Users;
    case 'itinerary_structure':
      return ListTree;
    case 'inter_day_travel':
      return ArrowRightLeft;
    case 'same_day_travel':
      return Route;
    case 'road_class':
      return Car;
    case 'opening_hours':
      return DoorOpen;
    default:
      break;
  }

  switch (resolveFeasibilityIssueVisualCategory(issue)) {
    case 'team_fit':
      return Users;
    case 'itinerary_completeness':
      return ListTree;
    case 'schedule':
      return CalendarDays;
    case 'transport':
      return Car;
    case 'booking':
      return BedDouble;
    case 'environment':
      return CloudSun;
    default:
      return Ticket;
  }
}

export function getFeasibilityIssueIconColorClasses(issue: FeasibilityIssueDto): string {
  switch (resolveFeasibilityIssueVisualCategory(issue)) {
    case 'team_fit':
      return 'text-muted-foreground dark:text-muted-foreground';
    case 'itinerary_completeness':
      return 'text-amber-600 dark:text-amber-400';
    case 'schedule':
      return 'text-muted-foreground dark:text-muted-foreground';
    case 'transport':
      return 'text-slate-600 dark:text-slate-400';
    case 'booking':
      return 'text-success dark:text-success';
    case 'environment':
      return 'text-muted-foreground dark:text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}
