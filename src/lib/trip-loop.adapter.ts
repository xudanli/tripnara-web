import type { ApplyRepairResponse } from '@/types/feasibility-repair';
import { normalizePersonaAlert, normalizePersonaAlerts } from '@/lib/persona-alert.adapter';
import type {
  InTripLoopUiView,
  InTripRecoveryLatestDto,
  InTripRecoveryRunResult,
  InTripRecommendedPlan,
  LoopApplyPatch,
  LoopApplyResponse,
  LoopIteration,
  LoopRecommendedPatch,
  LoopRunDetail,
  ReadinessRepairLatestDto,
  ReadinessRepairRunResult,
  ReadinessSnapshot,
  TripLoopChecklistItem,
  TripLoopIssueCard,
  TripLoopPrimaryAction,
  TripLoopUiView,
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

export function normalizeReadinessSnapshot(raw: unknown): ReadinessSnapshot {
  const r = asRecord(raw) ?? {};
  return {
    readinessScore: asNumber(r.readinessScore ?? r.readiness_score) ?? 0,
    hardBlockers: asNumber(r.hardBlockers ?? r.hard_blockers) ?? 0,
    mustHandleCount: asNumber(r.mustHandleCount ?? r.must_handle_count) ?? 0,
    suggestAdjustCount: asNumber(r.suggestAdjustCount ?? r.suggest_adjust_count) ?? 0,
    canStartExecute: asBool(r.canStartExecute ?? r.can_start_execute),
    verdictStatus: String(r.verdictStatus ?? r.verdict_status ?? 'UNKNOWN'),
    completionRateP10: asNumber(r.completionRateP10 ?? r.completion_rate_p10),
  };
}

function normalizeChecklistItem(raw: unknown): TripLoopChecklistItem | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  const label = asString(r.label);
  const result = asString(r.result) as TripLoopChecklistItem['result'] | undefined;
  if (!id || !label || !result) return null;
  return { id, label, result, detail: asString(r.detail) };
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

export function normalizeTripLoopUi(
  raw: unknown,
  snapshots?: { before?: ReadinessSnapshot; after?: ReadinessSnapshot },
): TripLoopUiView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const phase = asString(r.phase) as TripLoopUiView['phase'] | undefined;
  const headline = asString(r.headline);
  if (!phase || !headline) return null;

  const progressRaw = asRecord(r.progress) ?? {};
  const snapshotRaw = asRecord(r.snapshot);

  return {
    phase,
    headline,
    subheadline: asString(r.subheadline ?? r.sub_headline),
    progress: {
      completedChecks: asNumber(progressRaw.completedChecks ?? progressRaw.completed_checks) ?? 0,
      totalChecks: asNumber(progressRaw.totalChecks ?? progressRaw.total_checks) ?? 0,
      label: asString(progressRaw.label) ?? '',
    },
    checklist: (Array.isArray(r.checklist) ? r.checklist : [])
      .map(normalizeChecklistItem)
      .filter((x): x is TripLoopChecklistItem => x != null),
    personaAlerts: normalizePersonaAlerts(r.personaAlerts ?? r.persona_alerts),
    issueCards: (Array.isArray(r.issueCards ?? r.issue_cards) ? (r.issueCards ?? r.issue_cards) : [])
      .map(normalizeIssueCard)
      .filter((x): x is TripLoopIssueCard => x != null),
    primaryAction: normalizePrimaryAction(r.primaryAction ?? r.primary_action),
    snapshot:
      snapshotRaw || snapshots?.before || snapshots?.after
        ? {
            before: normalizeReadinessSnapshot(snapshotRaw?.before ?? snapshots?.before),
            after: normalizeReadinessSnapshot(snapshotRaw?.after ?? snapshots?.after),
          }
        : undefined,
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

export function normalizeRecommendedPatch(raw: unknown): LoopRecommendedPatch | null {
  const r = asRecord(raw);
  if (!r) return null;
  const issueId = asString(r.issueId ?? r.issue_id);
  const optionId = asString(r.optionId ?? r.option_id);
  if (!issueId || !optionId) return null;
  return {
    issueId,
    blockerId: asString(r.blockerId ?? r.blocker_id),
    optionId,
    title: asString(r.title),
    actionType: asString(r.actionType ?? r.action_type),
    previewStatus: asString(r.previewStatus ?? r.preview_status),
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

/** POST /readiness-repair — 扁平 ReadinessRepairLoopResult */
export function normalizeReadinessRepairRunResult(raw: unknown): ReadinessRepairRunResult | null {
  const r = asRecord(raw);
  if (!r) return null;
  const loopRunId = asString(r.loopRunId ?? r.loop_run_id);
  const status = asString(r.status);
  if (!loopRunId || !status) return null;

  const before = normalizeReadinessSnapshot(r.before);
  const after = normalizeReadinessSnapshot(r.after);
  const runtimeState =
    asString(r.runtimeState ?? r.runtime_state) ??
    (status === 'RUNNING' ? 'VALIDATING' : status === 'COMPLETED' ? 'MONITORING' : status);

  return {
    loopRunId,
    status: status as ReadinessRepairRunResult['status'],
    runtimeState,
    before,
    after,
    iterations: (Array.isArray(r.iterations) ? r.iterations : [])
      .map(normalizeIteration)
      .filter((x): x is LoopIteration => x != null),
    recommendedPatches: (Array.isArray(r.recommendedPatches ?? r.recommended_patches)
      ? (r.recommendedPatches ?? r.recommended_patches)
      : []
    )
      .map(normalizeRecommendedPatch)
      .filter((x): x is LoopRecommendedPatch => x != null),
    requiresApproval: asBool(r.requiresApproval ?? r.requires_approval),
    stopReason: asString(r.stopReason ?? r.stop_reason),
    ui: normalizeTripLoopUi(r.ui, { before, after }) ?? undefined,
  };
}

/** GET /readiness-repair/latest */
export function normalizeReadinessRepairLatest(raw: unknown): ReadinessRepairLatestDto {
  const r = asRecord(raw);
  if (!r) return { loopRun: null, ui: null };

  const loopRunRaw = r.loopRun ?? r.loop_run;
  return {
    loopRun: loopRunRaw ? normalizeLoopRunDetail(loopRunRaw) : null,
    ui: normalizeTripLoopUi(r.ui),
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

export function normalizeLoopApplyResponse(raw: unknown): LoopApplyResponse {
  const r = asRecord(raw) ?? {};
  const applied = Array.isArray(r.applied) ? (r.applied as ApplyRepairResponse[]) : [];
  return {
    applied,
    after: normalizeReadinessSnapshot(r.after),
    loopRunId: asString(r.loopRunId ?? r.loop_run_id),
    status: asString(r.status) as LoopApplyResponse['status'],
  };
}

const DEFAULT_PATCH_FLAGS = {
  executeDecision: true,
  persistDecision: true,
  runGuardianNegotiation: true,
} as const;

export function patchesFromRecommended(
  patches: LoopRecommendedPatch[],
): LoopApplyPatch[] {
  return patches.map((p) => ({
    issueId: p.issueId,
    optionId: p.optionId,
    ...DEFAULT_PATCH_FLAGS,
  }));
}

export function patchesFromIssueCards(cards: TripLoopIssueCard[]): LoopApplyPatch[] {
  return cards
    .filter((c) => c.issueId && c.optionId)
    .map((c) => ({
      issueId: c.issueId,
      optionId: c.optionId!,
      ...DEFAULT_PATCH_FLAGS,
    }));
}

/**
 * 组装 apply patches（后端不接受空数组）。
 * 优先级：recommendedPatches → session 缓存 → ui.issueCards
 */
export function buildApplyPatches(input: {
  recommendedPatches?: LoopRecommendedPatch[];
  cachedPatches?: LoopRecommendedPatch[];
  ui?: TripLoopUiView | null;
}): LoopApplyPatch[] {
  if (input.recommendedPatches?.length) {
    return patchesFromRecommended(input.recommendedPatches);
  }
  if (input.cachedPatches?.length) {
    return patchesFromRecommended(input.cachedPatches);
  }
  if (input.ui?.issueCards?.length) {
    return patchesFromIssueCards(input.ui.issueCards);
  }
  return [];
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
  ui?: TripLoopUiView | InTripLoopUiView | null;
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

export function summarizeLoopApplyResult(res: LoopApplyResponse): {
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

/** @deprecated 使用 normalizeReadinessRepairRunResult */
export const normalizeReadinessRepairLoopRun = normalizeReadinessRepairRunResult;

/** @deprecated 使用 normalizeInTripRecoveryRunResult */
export const normalizeInTripRecoveryLoopRun = normalizeInTripRecoveryRunResult;

/** @deprecated 使用 buildApplyPatches */
export const buildDefaultApplyPatches = (
  run: { recommendedPatches?: LoopRecommendedPatch[]; ui?: TripLoopUiView } | null,
) =>
  buildApplyPatches({
    recommendedPatches: run?.recommendedPatches,
    ui: run?.ui ?? null,
  });

/** @deprecated 使用 buildApplyInTripPlans */
export const buildDefaultInTripApplyPlans = (ui: InTripLoopUiView | null) =>
  buildApplyInTripPlans({ ui });

export function tripLoopPhaseLabel(phase: TripLoopUiView['phase']): string {
  switch (phase) {
    case 'validating':
      return '验证中';
    case 'issues_found':
      return '发现问题';
    case 'awaiting_approval':
      return '待您确认';
    case 'completed':
      return '验证通过';
    case 'failed':
      return '验证失败';
    default:
      return phase;
  }
}

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

/** C 端是否应展示 apply CTA — 只看 ui.phase */
export function readinessUiCanApply(ui: TripLoopUiView | null | undefined): boolean {
  if (!ui) return false;
  return ui.phase === 'awaiting_approval' || ui.phase === 'issues_found';
}

export function inTripUiCanApply(ui: InTripLoopUiView | null | undefined): boolean {
  if (!ui) return false;
  return ui.phase === 'awaiting_approval' || ui.phase === 'change_detected';
}
