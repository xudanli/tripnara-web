import type { ApplyRepairResponse } from '@/types/feasibility-repair';
import { normalizePersonaAlert } from '@/lib/persona-alert.adapter';
import type {
  InTripLoopUiView,
  InTripRecoveryLatestDto,
  InTripRecoveryRunResult,
  InTripRecommendedPlan,
  LoopIteration,
  LoopRunDetail,
  TripLoopIssueCard,
  TripLoopPrimaryAction,
} from '@/types/trip-loop';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

function normalizeIssueCard(raw: unknown): TripLoopIssueCard | null {
  const r = asRecord(raw);
  if (!r) return null;
  const issueId = asString(r.issueId ?? r.issue_id);
  const recommendation = asString(r.recommendation);
  if (!issueId && !asString(r.environmentEventId ?? r.environment_event_id)) return null;
  return {
    issueId: issueId ?? asString(r.environmentEventId ?? r.environment_event_id) ?? 'unknown',
    title: asString(r.title),
    problem: asString(r.problem),
    systemAttempts: asStringArray(r.systemAttempts ?? r.system_attempts),
    recommendation: recommendation ?? asString(r.title) ?? '',
    impact: asRecord(r.impact)
      ? {
          budgetDelta: asString((r.impact as Record<string, unknown>).budgetDelta),
          travelDelta: asString((r.impact as Record<string, unknown>).travelDelta),
          preferenceImpact: asString((r.impact as Record<string, unknown>).preferenceImpact),
        }
      : undefined,
    requiresApproval: asBool(r.requiresApproval ?? r.requires_approval),
    optionId: asString(r.optionId ?? r.option_id),
    triggerKind: asString(r.triggerKind ?? r.trigger_kind),
    environmentEventId: asString(r.environmentEventId ?? r.environment_event_id),
    planId: asString(r.planId ?? r.plan_id),
    personaAlert: normalizePersonaAlert(r.personaAlert ?? r.persona_alert) ?? undefined,
  };
}

function normalizePrimaryAction(raw: unknown): TripLoopPrimaryAction | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const label = asString(r.label);
  const loopRunId = asString(r.loopRunId ?? r.loop_run_id);
  if (!label || !loopRunId) return undefined;
  return {
    label,
    loopRunId,
    patchCount: asNumber(r.patchCount ?? r.patch_count),
    planCount: asNumber(r.planCount ?? r.plan_count),
  };
}

export function normalizeInTripLoopUi(raw: unknown): InTripLoopUiView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const phase = asString(r.phase) as InTripLoopUiView['phase'] | undefined;
  const headline = asString(r.headline);
  if (!phase || !headline) return null;
  const layersRaw = asRecord(r.layers) ?? {};

  return {
    phase,
    headline,
    subheadline: asString(r.subheadline ?? r.sub_headline),
    layers: {
      happened: asString(layersRaw.happened) ?? '',
      impact: asString(layersRaw.impact) ?? '',
      action: asString(layersRaw.action) ?? '',
    },
    issueCards: (Array.isArray(r.issueCards ?? r.issue_cards) ? (r.issueCards ?? r.issue_cards) : [])
      .map(normalizeIssueCard)
      .filter((x): x is TripLoopIssueCard => x != null),
    primaryAction: normalizePrimaryAction(r.primaryAction ?? r.primary_action),
  };
}

function normalizeIteration(raw: unknown): LoopIteration | null {
  const r = asRecord(raw);
  if (!r) return null;
  const sequence = asNumber(r.sequence);
  const issueId = asString(r.issueId ?? r.issue_id);
  if (sequence == null || !issueId) return null;
  const proposalRaw = asRecord(r.proposal);
  const validationRaw = asRecord(r.validation);
  return {
    sequence,
    issueId,
    blockerId: asString(r.blockerId ?? r.blocker_id),
    issueTitle: asString(r.issueTitle ?? r.issue_title),
    proposal: proposalRaw
      ? {
          optionId: asString(proposalRaw.optionId ?? proposalRaw.option_id) ?? '',
          title: asString(proposalRaw.title) ?? '',
          actionType: asString(proposalRaw.actionType ?? proposalRaw.action_type) ?? '',
        }
      : undefined,
    validation: validationRaw
      ? {
          passed: asBool(validationRaw.passed),
          previewStatus: asString(validationRaw.previewStatus ?? validationRaw.preview_status) ?? '',
          wouldDefer: asBool(validationRaw.wouldDefer ?? validationRaw.would_defer),
          feasibilityScoreBefore:
            asNumber(validationRaw.feasibilityScoreBefore ?? validationRaw.feasibility_score_before) ?? 0,
          feasibilityScoreAfter: asNumber(
            validationRaw.feasibilityScoreAfter ?? validationRaw.feasibility_score_after,
          ),
          completionRateP10: asNumber(
            validationRaw.completionRateP10 ?? validationRaw.completion_rate_p10,
          ),
        }
      : undefined,
    decision: asString(r.decision),
    attemptedOptions: asStringArray(r.attemptedOptions ?? r.attempted_options),
  };
}

function normalizeRecommendedPlan(raw: unknown): InTripRecommendedPlan | null {
  const r = asRecord(raw);
  if (!r) return null;
  const environmentEventId = asString(r.environmentEventId ?? r.environment_event_id);
  const planId = asString(r.planId ?? r.plan_id);
  if (!environmentEventId || !planId) return null;
  return { environmentEventId, planId, title: asString(r.title) };
}

/** GET latest → loopRun（DB 记录，id 即 loopRunId） */
export function normalizeLoopRunDetail(raw: unknown): LoopRunDetail | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id ?? r.loopRunId ?? r.loop_run_id);
  const status = asString(r.status);
  if (!id || !status) return null;

  return {
    id,
    loopRunId: id,
    status: status as LoopRunDetail['status'],
    runtimeState: asString(r.runtimeState ?? r.runtime_state),
    loopType: asString(r.loopType ?? r.loop_type),
    iterations: (Array.isArray(r.iterations) ? r.iterations : [])
      .map(normalizeIteration)
      .filter((x): x is LoopIteration => x != null),
    finalOutcome: r.finalOutcome ?? r.final_outcome,
  };
}

/** POST /in-trip-recovery */
export function normalizeInTripRecoveryRunResult(raw: unknown): InTripRecoveryRunResult | null {
  const r = asRecord(raw);
  if (!r) return null;
  const loopRunId = asString(r.loopRunId ?? r.loop_run_id);
  const status = asString(r.status);
  if (!loopRunId || !status) return null;

  const runtimeState =
    asString(r.runtimeState ?? r.runtime_state) ??
    (status === 'COMPLETED' ? 'MONITORING' : 'VALIDATING');

  return {
    loopRunId,
    status: status as InTripRecoveryRunResult['status'],
    runtimeState,
    recommendedPlans: (Array.isArray(r.recommendedPlans ?? r.recommended_plans)
      ? (r.recommendedPlans ?? r.recommended_plans)
      : []
    )
      .map(normalizeRecommendedPlan)
      .filter((x): x is InTripRecommendedPlan => x != null),
    requiresApproval: asBool(r.requiresApproval ?? r.requires_approval),
    ui: normalizeInTripLoopUi(r.ui) ?? undefined,
  };
}

/** GET /in-trip-recovery/latest */
export function normalizeInTripRecoveryLatest(raw: unknown): InTripRecoveryLatestDto {
  const r = asRecord(raw);
  if (!r) return { loopRun: null, ui: null };

  const loopRunRaw = r.loopRun ?? r.loop_run;
  return {
    loopRun: loopRunRaw ? normalizeLoopRunDetail(loopRunRaw) : null,
    ui: normalizeInTripLoopUi(r.ui),
  };
}

export function plansFromRecommended(plans: InTripRecommendedPlan[]): import('@/types/trip-loop').InTripApplyPlan[] {
  return plans.map((p) => ({
    environmentEventId: p.environmentEventId,
    planId: p.planId,
  }));
}

export function buildApplyInTripPlans(input: {
  recommendedPlans?: InTripRecommendedPlan[];
  cachedPlans?: InTripRecommendedPlan[];
  ui?: InTripLoopUiView | null;
}): import('@/types/trip-loop').InTripApplyPlan[] {
  if (input.recommendedPlans?.length) {
    return plansFromRecommended(input.recommendedPlans);
  }
  if (input.cachedPlans?.length) {
    return plansFromRecommended(input.cachedPlans);
  }
  if (input.ui?.issueCards?.length) {
    return input.ui.issueCards
      .filter((c) => c.environmentEventId && c.planId)
      .map((c) => ({
        environmentEventId: c.environmentEventId!,
        planId: c.planId!,
      }));
  }
  return [];
}

export function resolveLoopRunId(input: {
  runLoopRunId?: string | null;
  detail?: LoopRunDetail | null;
  ui?: InTripLoopUiView | null;
  sessionLoopRunId?: string | null;
}): string | null {
  return (
    input.runLoopRunId ??
    input.detail?.loopRunId ??
    input.detail?.id ??
    input.ui?.primaryAction?.loopRunId ??
    input.sessionLoopRunId ??
    null
  );
}

export function summarizeLoopApplyResult(res: { applied: ApplyRepairResponse[] }): {
  allApplied: boolean;
  deferred: ApplyRepairResponse[];
  applied: ApplyRepairResponse[];
} {
  const deferred = res.applied.filter((a) => a.status === 'deferred');
  const applied = res.applied.filter((a) => a.status === 'applied');
  return {
    allApplied: deferred.length === 0 && applied.length > 0,
    deferred,
    applied,
  };
}

/** @deprecated 使用 normalizeInTripRecoveryRunResult */
export const normalizeInTripRecoveryLoopRun = normalizeInTripRecoveryRunResult;

/** @deprecated 使用 buildApplyInTripPlans */
export const buildDefaultInTripApplyPlans = (ui: InTripLoopUiView | null) =>
  buildApplyInTripPlans({ ui });

export function inTripLoopPhaseLabel(phase: InTripLoopUiView['phase']): string {
  switch (phase) {
    case 'monitoring':
      return '监控中';
    case 'change_detected':
      return '检测到变化';
    case 'awaiting_approval':
      return '待您确认';
    case 'resolved':
      return '已处理';
    case 'failed':
      return '处理失败';
    default:
      return phase;
  }
}

export function inTripUiCanApply(ui: InTripLoopUiView | null | undefined): boolean {
  if (!ui) return false;
  return ui.phase === 'awaiting_approval' || ui.phase === 'change_detected';
}
