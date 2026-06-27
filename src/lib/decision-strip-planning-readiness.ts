import { gateExecuteBlockMessage } from '@/lib/gate-execute';
import { hasExperienceIntentMetadata } from '@/lib/trip-experience-metadata.util';
import type { PlanningConflictItem, PlanningConflictsInboxMetrics } from '@/lib/planning-conflicts.util';
import type { BudgetGateStatus } from '@/types/trip-budget';
import type { GateExecuteStatus } from '@/types/trip-reservation-evidence';
import type { TripDetail } from '@/types/trip';

export type PlanningReadinessCtaType =
  | 'open_gate'
  | 'open_budget'
  | 'open_conflicts'
  | 'confirm_regret'
  | 'open_team';

export interface PlanningReadinessPresentation {
  active: boolean;
  headline: string;
  subline: string | null;
  chips: string[];
  primaryCta: { type: PlanningReadinessCtaType; label: string };
  tone: 'blocked' | 'warning';
}

function countCategoryMust(
  items: PlanningConflictItem[],
  category: PlanningConflictItem['category'],
): number {
  return items.filter((item) => item.category === category && item.priority === 'must_handle')
    .length;
}

function countTeamInbox(items: PlanningConflictItem[]): number {
  return items.filter(
    (item) =>
      item.category === 'team_fit' &&
      (item.priority === 'must_handle' || item.priority === 'suggest_adjust'),
  ).length;
}

/** P0-4：gate > budget NEED_CONFIRM > access must > team */
export function resolvePlanningReadinessPresentation(input: {
  gateExecute: GateExecuteStatus;
  items: PlanningConflictItem[];
  inbox: PlanningConflictsInboxMetrics;
  budgetGate?: BudgetGateStatus | null;
  trip?: TripDetail | null;
  /** Plan Studio 已展示 PlanningConstraintsCard 时，Strip 不再重复 budget/team 提醒 */
  deferConstraintTopicsToCard?: boolean;
}): PlanningReadinessPresentation | null {
  const { gateExecute, items, inbox, budgetGate, trip, deferConstraintTopicsToCard } = input;
  const deferConstraints = deferConstraintTopicsToCard ?? false;
  const hasExperience = hasExperienceIntentMetadata(trip?.metadata);
  const regretPending = gateExecute.reasons.some((r) => r.code === 'experience_regret_unconfirmed');
  const accessHard = gateExecute.reasons.some((r) => r.code === 'access_hard_blocked');
  const budgetNeedConfirm = budgetGate?.verdict === 'NEED_CONFIRM';
  const budgetNeedAdjust = budgetGate?.verdict === 'NEED_ADJUST' || budgetGate?.verdict === 'REJECT';
  const accessMust = countCategoryMust(items, 'access_capacity');
  const teamCount = countTeamInbox(items);

  const budgetStripSignal = !deferConstraints && (budgetNeedConfirm || budgetNeedAdjust);
  const teamStripSignal = !deferConstraints && teamCount > 0;

  const chips: string[] = [];
  if (budgetStripSignal) {
    chips.push(budgetGate?.message?.trim() || '预算结构待确认');
  }
  if (regretPending && hasExperience) {
    chips.push('体验底线待确认');
  }
  if (accessMust > 0) {
    chips.push(`${accessMust} 项准入待办`);
  }
  if (teamStripSignal) {
    chips.push(`${teamCount} 项团队待办`);
  }
  if (inbox.inboxCount > 0 && inbox.mustCount > 0) {
    chips.push(`${inbox.mustCount} 项必处理`);
  }

  const hasSignal =
    gateExecute.blocked ||
    budgetStripSignal ||
    accessMust > 0 ||
    teamStripSignal ||
    inbox.inboxCount > 0;

  if (!hasSignal) return null;

  let headline = '';
  let primaryCta: PlanningReadinessPresentation['primaryCta'];
  let tone: PlanningReadinessPresentation['tone'] = 'warning';

  if (gateExecute.blocked) {
    tone = 'blocked';
    if (accessHard) {
      const reason = gateExecute.reasons.find((r) => r.code === 'access_hard_blocked');
      headline = reason?.message ?? '准入阻塞，暂不可出发';
      primaryCta = { type: 'open_conflicts', label: '处理准入阻塞' };
    } else if (regretPending && hasExperience) {
      headline = '出发前请确认体验底线';
      primaryCta = { type: 'confirm_regret', label: '确认体验底线' };
    } else {
      headline = gateExecuteBlockMessage(gateExecute) || '出发前仍有必须完成的事项';
      primaryCta = { type: 'open_gate', label: '查看阻塞项' };
    }
  } else if (budgetStripSignal) {
    headline = budgetGate?.message?.trim() || '预算结构待确认';
    primaryCta = { type: 'open_budget', label: '确认预算结构' };
    if (budgetGate?.verdict === 'REJECT') tone = 'blocked';
  } else if (accessMust > 0) {
    headline = `${accessMust} 项准入待处理`;
    primaryCta = { type: 'open_conflicts', label: '处理准入待办' };
  } else if (teamStripSignal) {
    headline = '团队节奏待对齐';
    primaryCta = { type: 'open_team', label: '对齐团队节奏' };
  } else {
    headline = `出发前还有 ${inbox.inboxCount} 项待办`;
    primaryCta = { type: 'open_conflicts', label: '打开可执行证明' };
  }

  const sublineParts = chips.filter((chip) => !headline.includes(chip.replace(/^\d+\s项/, '').trim()));
  const subline = sublineParts.length > 0 ? sublineParts.join(' · ') : null;

  return {
    active: true,
    headline,
    subline,
    chips,
    primaryCta,
    tone,
  };
}

export function mapPlanningReadinessToStripCta(
  cta: PlanningReadinessPresentation['primaryCta'],
): import('@/lib/decision-strip-model').DecisionStripPrimaryCta {
  const typeMap = {
    open_gate: 'open_feasibility',
    open_budget: 'open_budget',
    open_conflicts: 'open_conflicts',
    confirm_regret: 'confirm_regret',
    open_team: 'open_team',
  } as const;

  return {
    type: typeMap[cta.type],
    labelOverride: cta.label,
  };
}
