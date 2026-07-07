import { differenceInCalendarDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveTeamMembersSidebarSummary } from '@/lib/constraint-scope-options.util';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsContract } from '@/types/trip-constraints';
import type { WishSummary } from '@/types/trip-wishes';
import type { Collaborator, TripDetail } from '@/types/trip';
import { formatCurrency } from '@/utils/format';

export interface WorkbenchPlanningContextSection {
  id: 'trip' | 'team' | 'budget' | 'wishes';
  title: string;
  lines: string[];
}

function resolveTravelerCount(trip?: TripDetail | null): number {
  const fromPacing = trip?.pacingConfig?.travelers?.length;
  if (fromPacing && fromPacing > 0) return fromPacing;
  const fromTrip = trip?.travelers?.length;
  if (fromTrip && fromTrip > 0) return fromTrip;
  return 1;
}

function resolveTripDayCount(trip?: TripDetail | null): number | null {
  if (!trip?.startDate || !trip?.endDate) return null;
  try {
    const days = differenceInCalendarDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
    return days > 0 ? days : null;
  } catch {
    return null;
  }
}

function formatTripDateRange(trip?: TripDetail | null): string | null {
  if (!trip?.startDate || !trip?.endDate) return null;
  try {
    const start = format(new Date(trip.startDate), 'M月d日', { locale: zhCN });
    const end = format(new Date(trip.endDate), 'M月d日', { locale: zhCN });
    return `${start} – ${end}`;
  } catch {
    return null;
  }
}

function resolveCollaboratorLabels(collaborators?: Collaborator[] | null): string[] {
  return (collaborators ?? [])
    .map((item) => item.displayName?.trim() || item.email?.trim() || '')
    .filter(Boolean)
    .slice(0, 4);
}

function buildBudgetLines(budgetProfile?: TripBudgetProfile | null, travelerCount = 1): string[] {
  const intent = budgetProfile?.intent;
  if (!intent?.total) {
    return ['尚未设定总预算；可在预算 Tab 补充，以便 AI 按人均与结构分配。'];
  }

  const currency = intent.currency || 'CNY';
  const perPerson = Math.round(intent.total / Math.max(1, travelerCount));
  const lines = [`总预算 ${formatCurrency(intent.total, currency)}（约 ${formatCurrency(perPerson, currency)}/人）`];

  const estimated = budgetProfile?.actuals?.totalEstimated;
  if (typeof estimated === 'number' && estimated > 0) {
    lines.push(`当前方案估算 ${formatCurrency(estimated, currency)}`);
  }

  return lines;
}

function buildWishLines(wishSummary?: WishSummary | null): string[] {
  if (!wishSummary) {
    return ['尚未收集团队心愿；可在协作中心记录个人与团队想法。'];
  }

  const mine = wishSummary.mineCount ?? 0;
  const team = wishSummary.teamCount ?? 0;
  const eligible = wishSummary.agentEligibleCount ?? 0;
  const parts: string[] = [];

  if (mine > 0) parts.push(`我的心愿 ${mine} 条`);
  if (team > 0) parts.push(`团队心愿 ${team} 条`);
  if (wishSummary.privateCount > 0) parts.push(`私密 ${wishSummary.privateCount} 条`);

  if (parts.length === 0) {
    return ['尚未记录团队想法；私密与公开心愿都会影响后续方案取舍。'];
  }

  const lines = [parts.join(' · ')];
  if (eligible > 0) {
    lines.push(`${eligible} 条已标记可纳入 AI 规划`);
  } else {
    lines.push('记录想法后，AI 会结合约束一起安排节奏与取舍');
  }
  return lines;
}

/** 工作台左侧 · 行程规划上下文（团队 / 预算 / 想法等） */
export function buildWorkbenchPlanningContextSections(input: {
  trip?: TripDetail | null;
  budgetProfile?: TripBudgetProfile | null;
  contract?: TripConstraintsContract | null;
  wishSummary?: WishSummary | null;
  collaborators?: Collaborator[] | null;
}): WorkbenchPlanningContextSection[] {
  const { trip, budgetProfile, contract, wishSummary, collaborators } = input;
  const travelerCount = resolveTravelerCount(trip);
  const dayCount = resolveTripDayCount(trip);
  const dateRange = formatTripDateRange(trip);
  const destination = trip?.destination?.split(',')[0]?.trim() || trip?.name?.trim() || '当前目的地';

  const tripLines: string[] = [];
  const durationLabel = dayCount ? `${dayCount} 天` : '多日';
  tripLines.push(`${destination} · ${durationLabel} · ${travelerCount} 人同行`);
  if (dateRange) tripLines.push(dateRange);

  const teamSummary = resolveTeamMembersSidebarSummary({
    contract,
    trip,
    memberConstraintItems: contract?.teamGovernance?.members,
  });
  const collaboratorLabels = resolveCollaboratorLabels(collaborators);
  const teamLines = [teamSummary];
  if (collaboratorLabels.length > 0) {
    teamLines.push(`协作成员：${collaboratorLabels.join('、')}${(collaborators?.length ?? 0) > collaboratorLabels.length ? ' 等' : ''}`);
  }

  return [
    { id: 'trip', title: '行程概览', lines: tripLines },
    { id: 'team', title: '团队情况', lines: teamLines },
    { id: 'budget', title: '预算意向', lines: buildBudgetLines(budgetProfile, travelerCount) },
    { id: 'wishes', title: '团队想法', lines: buildWishLines(wishSummary) },
  ];
}

export function buildWorkbenchPlanningContextNarrative(
  sections: WorkbenchPlanningContextSection[],
): string {
  const trip = sections.find((section) => section.id === 'trip');
  const team = sections.find((section) => section.id === 'team');
  const budget = sections.find((section) => section.id === 'budget');
  const wishes = sections.find((section) => section.id === 'wishes');

  const parts = [
    trip?.lines[0],
    team?.lines[0],
    budget?.lines[0],
    wishes?.lines[0],
  ].filter(Boolean);

  return parts.join('。') + (parts.length > 0 ? '。' : '');
}
