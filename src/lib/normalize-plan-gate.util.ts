import type {
  PlanGateCommitResult,
  PlanGateDraftDiff,
  PlanGateMapGeoJson,
  PlanGateMemberChange,
  PlanGateMemberChangeKind,
  PlanGateOverallStatus,
  PlanGatePendingConfirmation,
  PlanGatePipelineStep,
  PlanGatePipelineStepStatus,
  PlanGatePreTripTask,
  PlanGatePreTripTasks,
  PlanGateReadinessResponse,
  PlanGateRiskChangeKind,
  PlanGateSubmitEligibility,
  PlanGateTimelineMaterialization,
  PlanGateUiOutput,
  PlanGateVerificationProjection,
} from '@/types/plan-gate';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readOverallStatus(value: unknown): PlanGateOverallStatus {
  const s = readString(value);
  if (
    s === 'pass' ||
    s === 'suggest_adjust' ||
    s === 'need_confirm' ||
    s === 'blocked' ||
    s === 'insufficient_data'
  ) {
    return s;
  }
  return 'need_confirm';
}

function normalizePipelineStepStatus(value: unknown): PlanGatePipelineStepStatus {
  const s = readString(value);
  if (
    s === 'pending' ||
    s === 'running' ||
    s === 'completed' ||
    s === 'failed' ||
    s === 'waiting'
  ) {
    return s;
  }
  return 'pending';
}

function normalizePendingConfirmation(raw: unknown): PlanGatePendingConfirmation | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = readString(o.id);
  const title = readString(o.title);
  const description = readString(o.description) ?? '';
  const kind = o.kind === 'trade_off' ? 'trade_off' : 'sign_off';
  if (!id || !title) return null;

  const optionsRaw = Array.isArray(o.options) ? o.options : [];
  const options = optionsRaw
    .map((item) => {
      const opt = asRecord(item);
      if (!opt) return null;
      const optId = readString(opt.id);
      const label = readString(opt.label);
      if (!optId || !label) return null;
      return {
        id: optId,
        label,
        description: readString(opt.description),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  return {
    id,
    title,
    description,
    kind,
    ...(options.length > 0 ? { options } : {}),
  };
}

function normalizeVerification(raw: unknown): PlanGateVerificationProjection | null {
  const o = asRecord(raw);
  if (!o) return null;

  const dimensionsRaw = Array.isArray(o.dimensions) ? o.dimensions : [];
  const dimensions = dimensionsRaw
    .map((item) => {
      const d = asRecord(item);
      if (!d) return null;
      const title = readString(d.title);
      const key = readString(d.key) ?? 'unknown';
      if (!title) return null;
      return {
        key,
        title,
        status: readOverallStatus(d.status),
        summary: readString(d.summary),
        checks: Array.isArray(d.checks)
          ? d.checks
              .map((check) => {
                const c = asRecord(check);
                if (!c) return null;
                return {
                  label: readString(c.label),
                  status: readString(c.status),
                  detail: readString(c.detail) ?? readString(c.description),
                  description: readString(c.description),
                };
              })
              .filter((check): check is NonNullable<typeof check> => check != null)
          : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const pendingRaw = Array.isArray(o.pendingConfirmations) ? o.pendingConfirmations : [];
  const pendingConfirmations = pendingRaw
    .map(normalizePendingConfirmation)
    .filter((item): item is PlanGatePendingConfirmation => item != null);

  const metricsRaw = asRecord(o.metrics);
  const metrics = metricsRaw
    ? {
        executability: readNumber(metricsRaw.executability),
        executabilityDelta: readNumber(metricsRaw.executabilityDelta),
        budgetPerPerson: readNumber(metricsRaw.budgetPerPerson),
        budgetPerPersonDelta: readNumber(metricsRaw.budgetPerPersonDelta),
        totalBudget: readNumber(metricsRaw.totalBudget),
        totalDrivingMinutes: readNumber(metricsRaw.totalDrivingMinutes),
        totalDrivingMinutesDelta: readNumber(metricsRaw.totalDrivingMinutesDelta),
        affectedDayCount: readNumber(metricsRaw.affectedDayCount),
        memberCount: readNumber(metricsRaw.memberCount),
        currency: readString(metricsRaw.currency),
      }
    : undefined;

  return {
    draftLabel: readString(o.draftLabel) ?? '—',
    overallStatus: readOverallStatus(o.overallStatus),
    dimensions,
    pendingConfirmations,
    metrics,
    headline: readString(o.headline),
  };
}

function normalizeRiskChangeKind(value: unknown): PlanGateRiskChangeKind | string {
  const s = readString(value);
  if (s === 'resolved' || s === 'new' || s === 'retained' || s === 'pending') return s;
  return s ?? 'pending';
}

function normalizeMetricDelta(raw: unknown): { from?: number; to?: number; delta?: number } | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const from = readNumber(o.from);
  const to = readNumber(o.to);
  const delta = readNumber(o.delta);
  if (from == null && to == null && delta == null) return undefined;
  return { from, to, delta };
}

function normalizeMapGeoJson(raw: unknown): PlanGateMapGeoJson | undefined {
  const o = asRecord(raw);
  if (!o || o.type !== 'FeatureCollection') return undefined;
  const features = Array.isArray(o.features)
    ? (o.features.filter(
        (f) => f && typeof f === 'object' && (f as GeoJSON.Feature).type === 'Feature',
      ) as GeoJSON.Feature[])
    : [];
  if (features.length === 0) return undefined;

  const legendRaw = Array.isArray(o.legend) ? o.legend : [];
  const legend = legendRaw
    .map((item) => {
      const l = asRecord(item);
      if (!l) return null;
      const key = readString(l.key);
      const label = readString(l.label);
      const color = readString(l.color);
      if (!key || !label || !color) return null;
      return { key, label, color };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const boundsRaw = Array.isArray(o.bounds) ? o.bounds : null;
  const bounds =
    boundsRaw?.length === 4 && boundsRaw.every((n) => typeof n === 'number' && Number.isFinite(n))
      ? (boundsRaw as [number, number, number, number])
      : undefined;

  return {
    type: 'FeatureCollection',
    features,
    ...(legend.length > 0 ? { legend } : {}),
    ...(bounds ? { bounds } : {}),
  };
}

function normalizePreTripTask(raw: unknown): PlanGatePreTripTask | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = readString(o.id);
  const title = readString(o.title);
  const category = readString(o.category) ?? 'general';
  const priority = readString(o.priority) ?? 'medium';
  const source = readString(o.source) ?? 'plan';
  if (!id || !title) return null;
  return {
    id,
    title,
    category,
    priority,
    source,
    day: readNumber(o.day),
  };
}

export function normalizePlanGatePreTripTasks(raw: unknown): PlanGatePreTripTasks | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const tasksRaw = Array.isArray(o.tasks) ? o.tasks : [];
  const tasks = tasksRaw
    .map(normalizePreTripTask)
    .filter((item): item is PlanGatePreTripTask => item != null);

  const total = readNumber(o.total) ?? tasks.length;
  const highPriority =
    readNumber(o.highPriority) ??
    tasks.filter((t) => t.priority === 'high').length;

  if (total === 0 && tasks.length === 0) return undefined;

  return { total, highPriority, tasks };
}

function normalizeImpact(value: unknown): 'low' | 'medium' | 'high' {
  const s = readString(value);
  if (s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

function normalizeMemberChangeKind(value: unknown): PlanGateMemberChangeKind | string {
  const s = readString(value);
  if (
    s === 'split_added' ||
    s === 'split_removed' ||
    s === 'meetup_changed' ||
    s === 'branch_changed' ||
    s === 'member_assignment_changed'
  ) {
    return s;
  }
  return s ?? 'member_assignment_changed';
}

function normalizeMemberChanges(raw: unknown): PlanGateMemberChange[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const changes = raw
    .map((item) => {
      const o = asRecord(item);
      if (!o) return null;
      const day = readNumber(o.day);
      const label = readString(o.label);
      const kind = normalizeMemberChangeKind(o.kind);
      if (day == null || !label) return null;
      const change: PlanGateMemberChange = {
        day,
        kind,
        label,
        impact: normalizeImpact(o.impact),
        missingMeetup: o.missingMeetup === true,
      };
      const before = readString(o.before);
      const after = readString(o.after);
      if (before) change.before = before;
      if (after) change.after = after;
      return change;
    })
    .filter((item): item is PlanGateMemberChange => item != null);
  return changes.length > 0 ? changes : undefined;
}

export function normalizePlanGateFeasibility(raw: unknown): import('@/types/plan-gate').PlanGateFeasibilityResponse | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const baselineScore = readNumber(o.baselineScore ?? o.baseline_score);
  const draftScore = readNumber(o.draftScore ?? o.draft_score ?? o.executability);
  const executabilityDelta = readNumber(o.executabilityDelta ?? o.executability_delta);

  if (baselineScore == null && draftScore == null) return undefined;

  return {
    baselineScore,
    draftScore,
    executabilityDelta,
    planId: readString(o.planId ?? o.plan_id),
    source: readString(o.source),
  };
}

function normalizeDraftDiff(raw: unknown): PlanGateDraftDiff | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const metricsRaw = asRecord(o.metrics);
  const metrics = metricsRaw
    ? {
        executability: readNumber(metricsRaw.executability),
        executabilityDelta: readNumber(metricsRaw.executabilityDelta),
        budgetPerPerson: readNumber(metricsRaw.budgetPerPerson),
        budgetPerPersonDelta: readNumber(metricsRaw.budgetPerPersonDelta),
        totalDrivingMinutes: readNumber(metricsRaw.totalDrivingMinutes),
        totalDrivingMinutesDelta: readNumber(metricsRaw.totalDrivingMinutesDelta),
        affectedDays: readNumber(metricsRaw.affectedDays),
        memberCount: readNumber(metricsRaw.memberCount),
        currency: readString(metricsRaw.currency),
      }
    : undefined;

  const timelineChanges = Array.isArray(o.timelineChanges)
    ? o.timelineChanges
        .map((item) => {
          const t = asRecord(item);
          if (!t) return null;
          const kind = readString(t.kind);
          if (!kind) return null;
          return {
            kind,
            day: readNumber(t.day),
            label: readString(t.label),
            before: readString(t.before),
            after: readString(t.after),
            impact: readString(t.impact),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  const mapChanges = Array.isArray(o.mapChanges)
    ? o.mapChanges
        .map((item) => {
          const m = asRecord(item);
          if (!m) return null;
          return {
            day: readNumber(m.day),
            label: readString(m.label),
            changeType: readString(m.changeType),
            distanceKmDelta: readNumber(m.distanceKmDelta),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  const riskChanges = Array.isArray(o.riskChanges)
    ? o.riskChanges
        .map((item) => {
          const r = asRecord(item);
          if (!r) return null;
          const label = readString(r.label);
          if (!label) return null;
          return {
            kind: normalizeRiskChangeKind(r.kind),
            label,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  const changeLog = Array.isArray(o.changeLog)
    ? o.changeLog.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;

  const mapGeoJson = normalizeMapGeoJson(o.mapGeoJson ?? o.map_geo_json);
  const memberChanges = normalizeMemberChanges(o.memberChanges ?? o.member_changes);

  return {
    baselinePlanId: readString(o.baselinePlanId),
    baselineLabel: readString(o.baselineLabel),
    draftPlanId: readString(o.draftPlanId),
    draftLabel: readString(o.draftLabel),
    timelineChanges,
    metrics,
    mapChanges,
    ...(mapGeoJson ? { mapGeoJson } : {}),
    ...(memberChanges ? { memberChanges } : {}),
    riskChanges,
    changeLog,
    affectedDayCount: readNumber(o.affectedDayCount),
  };
}

function normalizeTimelineMaterialization(raw: unknown): PlanGateTimelineMaterialization | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const added = readNumber(o.added);
  const modified = readNumber(o.modified);
  const removed = readNumber(o.removed);
  const commitDaysRaw = Array.isArray(o.commitDays)
    ? o.commitDays
    : Array.isArray(o.commit_days)
      ? o.commit_days
      : null;
  const commitDays = commitDaysRaw
    ? commitDaysRaw.filter((d): d is number => typeof d === 'number' && Number.isFinite(d))
    : undefined;

  if (
    added == null &&
    modified == null &&
    removed == null &&
    !commitDays?.length &&
    o.partialCommit !== true &&
    o.partial_commit !== true &&
    o.degradedToProposed !== true &&
    o.degraded_to_proposed !== true
  ) {
    return undefined;
  }

  return {
    added,
    modified,
    removed,
    partialCommit: o.partialCommit === true || o.partial_commit === true,
    ...(commitDays?.length ? { commitDays } : {}),
    degradedToProposed: o.degradedToProposed === true || o.degraded_to_proposed === true,
  };
}

function normalizeCommitResult(raw: unknown): PlanGateCommitResult | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const metricsRaw = asRecord(o.metrics);
  const metrics = metricsRaw
    ? {
        executability: normalizeMetricDelta(metricsRaw.executability),
        budgetPerPerson: normalizeMetricDelta(metricsRaw.budgetPerPerson),
        totalDrivingMinutes: normalizeMetricDelta(metricsRaw.totalDrivingMinutes),
        affectedDays: normalizeMetricDelta(metricsRaw.affectedDays),
      }
    : undefined;

  const nextActions = Array.isArray(o.nextActions)
    ? o.nextActions
        .map((item) => {
          const a = asRecord(item);
          if (!a) return null;
          const label = readString(a.label);
          const action = readString(a.action);
          if (!label || !action) return null;
          return { label, action };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : undefined;

  const preTripTasks = normalizePlanGatePreTripTasks(o.preTripTasks ?? o.pre_trip_tasks);
  const timelineMaterialization = normalizeTimelineMaterialization(
    o.timelineMaterialization ?? o.timeline_materialization ?? o.changes,
  );

  return {
    success: o.success === true,
    committedPlanId: readString(o.committedPlanId),
    committedVersionLabel: readString(o.committedVersionLabel),
    committedAt: readString(o.committedAt),
    headline: readString(o.headline),
    updates: Array.isArray(o.updates)
      ? o.updates.filter((x): x is string => typeof x === 'string')
      : undefined,
    metrics,
    preTripTasksCount: readNumber(o.preTripTasksCount) ?? preTripTasks?.total,
    ...(preTripTasks ? { preTripTasks } : {}),
    ...(timelineMaterialization ? { timelineMaterialization } : {}),
    nextActions,
  };
}

export function normalizePlanGateDraftDiff(raw: unknown): PlanGateDraftDiff | undefined {
  return normalizeDraftDiff(raw);
}

export function normalizePlanGateCommitResult(raw: unknown): PlanGateCommitResult | undefined {
  return normalizeCommitResult(raw);
}

export function resolvePlanGateDisplayMetrics(
  planGate: PlanGateUiOutput | undefined,
): PlanGateVerificationProjection['metrics'] {
  const verificationMetrics = planGate?.verification.metrics;
  const diffMetrics = planGate?.draftDiff?.metrics;
  if (!verificationMetrics && !diffMetrics) return undefined;

  return {
    executability: verificationMetrics?.executability ?? diffMetrics?.executability,
    executabilityDelta:
      verificationMetrics?.executabilityDelta ?? diffMetrics?.executabilityDelta,
    budgetPerPerson: verificationMetrics?.budgetPerPerson ?? diffMetrics?.budgetPerPerson,
    budgetPerPersonDelta:
      verificationMetrics?.budgetPerPersonDelta ?? diffMetrics?.budgetPerPersonDelta,
    totalBudget: verificationMetrics?.totalBudget,
    totalDrivingMinutes:
      verificationMetrics?.totalDrivingMinutes ?? diffMetrics?.totalDrivingMinutes,
    totalDrivingMinutesDelta:
      verificationMetrics?.totalDrivingMinutesDelta ?? diffMetrics?.totalDrivingMinutesDelta,
    affectedDayCount:
      verificationMetrics?.affectedDayCount ??
      diffMetrics?.affectedDays ??
      planGate?.draftDiff?.affectedDayCount,
    memberCount: verificationMetrics?.memberCount ?? diffMetrics?.memberCount,
    currency: verificationMetrics?.currency ?? diffMetrics?.currency,
  };
}

function normalizeSubmitEligibility(raw: unknown): PlanGateSubmitEligibility | null {
  const o = asRecord(raw);
  if (!o) return null;

  const modeRaw = readString(o.mode);
  const mode =
    modeRaw === 'ready' ||
    modeRaw === 'pending_confirmations' ||
    modeRaw === 'blocked' ||
    modeRaw === 'insufficient_data'
      ? modeRaw
      : 'pending_confirmations';

  return {
    mode,
    canSubmitToTimeline: o.canSubmitToTimeline === true,
    canSubmitWithAcceptedRisk: o.canSubmitWithAcceptedRisk === true,
    blockers: Array.isArray(o.blockers)
      ? o.blockers.filter((x): x is string => typeof x === 'string')
      : [],
    requiredConfirmationIds: Array.isArray(o.requiredConfirmationIds)
      ? o.requiredConfirmationIds.filter((x): x is string => typeof x === 'string')
      : [],
    satisfiedConfirmationIds: Array.isArray(o.satisfiedConfirmationIds)
      ? o.satisfiedConfirmationIds.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

export function normalizePlanGateUiOutput(raw: unknown): PlanGateUiOutput | undefined {
  const root = asRecord(raw);
  if (!root) return undefined;

  const verification = normalizeVerification(root.verification);
  const submitEligibility = normalizeSubmitEligibility(root.submitEligibility);
  if (!verification || !submitEligibility) return undefined;

  const draftDiff = normalizeDraftDiff(root.draftDiff ?? root.draft_diff);
  const commitResult = normalizeCommitResult(root.commitResult ?? root.commit_result);
  const preTripTasks = normalizePlanGatePreTripTasks(root.preTripTasks ?? root.pre_trip_tasks);

  return {
    verification,
    submitEligibility,
    ...(draftDiff ? { draftDiff } : {}),
    ...(preTripTasks ? { preTripTasks } : {}),
    ...(commitResult ? { commitResult } : {}),
  };
}

export function normalizePlanGatePipelineSteps(raw: unknown): PlanGatePipelineStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: PlanGatePipelineStep[] = [];
  raw.forEach((item, index) => {
    const o = asRecord(item);
    if (!o) return;
    const label = readString(o.label) ?? readString(o.title) ?? readString(o.name);
    if (!label) return;
    steps.push({
      id: readString(o.id) ?? `step-${index + 1}`,
      label,
      status: normalizePipelineStepStatus(o.status),
      order: readNumber(o.order) ?? index + 1,
    });
  });
  return steps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function normalizePlanGateReadiness(raw: unknown): PlanGateReadinessResponse {
  const o = asRecord(raw);
  if (!o) return {};

  return {
    confirmedConstraintCount: readNumber(o.confirmedConstraintCount),
    decisionConclusionCount: readNumber(o.decisionConclusionCount),
    budgetPerPerson: readNumber(o.budgetPerPerson),
    budgetCurrency: readString(o.budgetCurrency),
    memberCount: readNumber(o.memberCount),
    missingInfoCount: readNumber(o.missingInfoCount),
    blockers: Array.isArray(o.blockers)
      ? o.blockers.filter((x): x is string => typeof x === 'string')
      : undefined,
    warnings: Array.isArray(o.warnings)
      ? o.warnings.filter((x): x is string => typeof x === 'string')
      : undefined,
    canGenerateDraft: typeof o.canGenerateDraft === 'boolean' ? o.canGenerateDraft : undefined,
  };
}

export function pickPlanGateFromUiOutput(raw: unknown): PlanGateUiOutput | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  return normalizePlanGateUiOutput(r.planGate ?? r.plan_gate);
}
