import { buildPlanStudioDecisionSpacePath } from '@/lib/plan-studio-decision-navigation.util';
import type { OverallReadinessActionCode } from '@/types/overall-readiness';

export function buildOverallReadinessReportPath(tripId: string): string {
  return `/dashboard/trips/${encodeURIComponent(tripId)}/overall-readiness`;
}

function buildPlanStudioDecisionProfilingHref(
  tripId: string,
  step: 'travel_style' | 'money_dna',
): string {
  const params = new URLSearchParams({
    tripId,
    openDecisionProfiling: '1',
    decisionProfilingSurface: 'quiz',
    decisionProfilingStep: step,
  });
  return `/dashboard/plan-studio?${params.toString()}`;
}

/**
 * actionCode / deepLink → 前端可导航路径。
 * 未知码落到准备报告页。
 */
export function resolveOverallReadinessActionHref(
  tripId: string,
  options?: {
    actionCode?: OverallReadinessActionCode | string | null;
    deepLink?: string | null;
  },
): string {
  const code = (options?.actionCode ?? '').trim().toUpperCase();
  const deep = (options?.deepLink ?? '').trim().toLowerCase();

  if (code === 'CONFIRM_VEHICLE' || code === 'CONFIRM_RENTAL_INSURANCE' || code === 'OPEN_DECISION_SPACE') {
    return buildPlanStudioDecisionSpacePath(tripId);
  }
  if (code === 'OPEN_FEASIBILITY_REPORT') {
    return `/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}`;
  }
  if (code === 'OPEN_ACCOMMODATION_TAB' || deep === 'accommodation') {
    return `/dashboard/trips/${encodeURIComponent(tripId)}?tab=bookings`;
  }
  if (code === 'BOOK_CORE_ACTIVITY' || deep === 'activities') {
    return `/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}&tab=schedule`;
  }
  if (code === 'INVITE_MEMBER_CONFIRM' || code === 'ASSIGN_MEMBER_ROLES' || deep === 'members') {
    return `/dashboard/trips/${encodeURIComponent(tripId)}?tab=members`;
  }
  if (code === 'COMPLETE_TRAVEL_STYLE') {
    return buildPlanStudioDecisionProfilingHref(tripId, 'travel_style');
  }
  if (code === 'COMPLETE_MONEY_DNA') {
    return buildPlanStudioDecisionProfilingHref(tripId, 'money_dna');
  }

  if (deep === 'decision-space') {
    return buildPlanStudioDecisionSpacePath(tripId);
  }
  if (deep.startsWith('/dashboard/') || deep.startsWith('/trips/')) {
    return deep;
  }

  return buildOverallReadinessReportPath(tripId);
}
