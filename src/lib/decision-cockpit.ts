import type { RouteAndRunResponse } from '@/api/agent';
import {
  normalizeWorldConstraintMaterialization,
  type RouteRunMonteCarloSummary,
} from '@/lib/world-model-guards';
import type {
  DecisionCockpitCounterfactual,
  DecisionCockpitDto,
  DecisionCockpitIntegrityBadge,
  DecisionCockpitIntegrityBadgeKey,
  DecisionCockpitRiskFactor,
  DecisionCockpitTraceRow,
} from '@/types/decision-cockpit';

const INTEGRITY_BADGE_LABELS: Record<string, string> = {
  traceability: '可追溯',
  physical_evidence: '物理证据',
  narrative_drift: '叙事漂移',
};

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function normalizeMonteCarlo(raw: unknown): RouteRunMonteCarloSummary | undefined {
  const m = asRecord(raw);
  if (!m) return undefined;
  const used = m.used === true;
  const total_samples =
    typeof m.total_samples === 'number' && Number.isFinite(m.total_samples)
      ? m.total_samples
      : undefined;
  if (!used && total_samples == null) return undefined;
  return { used, total_samples };
}

function normalizeIntegrityBadge(raw: unknown): DecisionCockpitIntegrityBadge | null {
  const o = asRecord(raw);
  if (!o) return null;
  const key = (asString(o.key) ?? asString(o.badge) ?? asString(o.id) ?? '').toLowerCase();
  if (!key) return null;
  const status = (asString(o.status) ?? 'unknown').toLowerCase() as DecisionCockpitIntegrityBadge['status'];
  const label_zh = asString(o.label_zh) ?? asString(o.label) ?? INTEGRITY_BADGE_LABELS[key];
  const summary_zh = asString(o.summary_zh) ?? asString(o.summary) ?? asString(o.message_zh);
  return { key: key as DecisionCockpitIntegrityBadgeKey, status, label_zh, summary_zh };
}

function normalizeIntegrityBadges(raw: unknown): DecisionCockpitIntegrityBadge[] | undefined {
  if (Array.isArray(raw)) {
    const out = raw
      .map(normalizeIntegrityBadge)
      .filter((b): b is DecisionCockpitIntegrityBadge => b != null && isMeaningfulIntegrityBadge(b));
    return out.length ? out : undefined;
  }
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const out: DecisionCockpitIntegrityBadge[] = [];
  for (const [key, val] of Object.entries(rec)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = normalizeIntegrityBadge({ key, ...(val as object) });
      if (nested && isMeaningfulIntegrityBadge(nested)) out.push(nested);
      continue;
    }
    if (typeof val === 'string' && val.trim().toLowerCase() !== 'unknown') {
      out.push({
        key: key as DecisionCockpitIntegrityBadgeKey,
        status: val as DecisionCockpitIntegrityBadge['status'],
        label_zh: INTEGRITY_BADGE_LABELS[key],
      });
    }
  }
  return out.length ? out : undefined;
}

function normalizeTraceRow(raw: unknown): DecisionCockpitTraceRow | null {
  const o = asRecord(raw);
  if (!o) return null;
  const persona = asString(o.persona) ?? asString(o.guardian) ?? asString(o.agent);
  if (!persona) return null;
  const evidenceRaw = o.evidence_tags ?? o.evidenceTags;
  const evidence_tags = Array.isArray(evidenceRaw)
    ? evidenceRaw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : undefined;
  const row: DecisionCockpitTraceRow = {
    persona,
    persona_label_zh: asString(o.persona_label_zh) ?? asString(o.personaLabelZh),
    step: asString(o.step),
    phase: asString(o.phase) ?? asString(o.current_phase),
    verdict: asString(o.verdict) ?? asString(o.decision),
    summary_zh:
      asString(o.summary_zh) ??
      asString(o.summary) ??
      asString(o.message_zh) ??
      asString(o.rationale_zh),
    detail_zh: asString(o.detail_zh) ?? asString(o.detail),
    evidence_tags,
  };
  return isMeaningfulTraceRow(row) ? row : null;
}

/** trace 行至少需阶段 / 结论 / 说明 / 证据之一，否则仅为占位符 */
export function isMeaningfulTraceRow(row: DecisionCockpitTraceRow): boolean {
  return Boolean(
    row.phase?.trim() ||
      row.step?.trim() ||
      row.verdict?.trim() ||
      row.summary_zh?.trim() ||
      row.detail_zh?.trim() ||
      row.evidence_tags?.length
  );
}

function isMeaningfulIntegrityBadge(b: DecisionCockpitIntegrityBadge): boolean {
  const status = (b.status ?? '').toLowerCase();
  if (status && status !== 'unknown') return true;
  return Boolean(b.summary_zh?.trim());
}

function isMeaningfulRiskFactor(f: DecisionCockpitRiskFactor): boolean {
  const hasLabel = Boolean(f.label_zh?.trim() || f.id?.trim());
  if (!hasLabel) return false;
  return Boolean(
    f.detail_zh?.trim() || f.source_refs?.length || f.severity?.trim() || f.grounded === true
  );
}

function normalizeRiskFactor(raw: unknown): DecisionCockpitRiskFactor | null {
  const o = asRecord(raw);
  if (!o) return null;
  const label_zh =
    asString(o.label_zh) ??
    asString(o.label) ??
    asString(o.title_zh) ??
    asString(o.factor_zh);
  if (!label_zh && !asString(o.id)) return null;
  const sourceRaw = o.source_refs ?? o.sourceRefs ?? o.evidence_refs;
  const source_refs = Array.isArray(sourceRaw)
    ? sourceRaw.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : undefined;
  return {
    id: asString(o.id),
    label_zh,
    severity: asString(o.severity)?.toUpperCase() as DecisionCockpitRiskFactor['severity'],
    grounded: o.grounded === true || o.is_grounded === true,
    source_refs,
    detail_zh: asString(o.detail_zh) ?? asString(o.detail) ?? asString(o.description_zh),
  };
}

function normalizeRiskFactors(raw: unknown): DecisionCockpitRiskFactor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeRiskFactor)
    .filter((f): f is DecisionCockpitRiskFactor => f != null && isMeaningfulRiskFactor(f));
  return out.length ? out : undefined;
}

function normalizeCounterfactual(raw: unknown): DecisionCockpitCounterfactual | null {
  const o = asRecord(raw);
  if (!o) return null;
  const question_zh =
    asString(o.question_zh) ??
    asString(o.question) ??
    asString(o.prompt_zh);
  if (!question_zh) return null;
  return {
    question_zh,
    answer_zh: asString(o.answer_zh) ?? asString(o.answer) ?? asString(o.response_zh),
    baseline_alternative_id:
      asString(o.baseline_alternative_id) ?? asString(o.baseline_plan_id) ?? asString(o.base_plan_id),
    chosen_alternative_id:
      asString(o.chosen_alternative_id) ?? asString(o.chosen_plan_id),
  };
}

function normalizeApis(raw: unknown): DecisionCockpitDto['apis'] | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const cf = asRecord(o.counterfactual);
  if (!cf) return Object.keys(o).length ? (o as DecisionCockpitDto['apis']) : undefined;
  return {
    counterfactual: {
      path: asString(cf.path),
      method: asString(cf.method),
      trip_run_id: asString(cf.trip_run_id) ?? asString(cf.tripRunId),
      payload: asRecord(cf.payload),
    },
  };
}

export function normalizeDecisionCockpit(raw: unknown): DecisionCockpitDto | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const integrity_badges = normalizeIntegrityBadges(o.integrity_badges ?? o.integrityBadges);
  const decision_trace_rows = Array.isArray(o.decision_trace_rows ?? o.decisionTraceRows)
    ? (o.decision_trace_rows ?? o.decisionTraceRows)
        .map(normalizeTraceRow)
        .filter((r): r is DecisionCockpitTraceRow => r != null)
    : undefined;
  const grounded_factors = normalizeRiskFactors(o.grounded_factors ?? o.groundedFactors);
  const risk_factors =
    normalizeRiskFactors(o.risk_factors ?? o.riskFactors) ?? grounded_factors;
  const counterfactuals = Array.isArray(o.counterfactuals)
    ? o.counterfactuals
        .map(normalizeCounterfactual)
        .filter((c): c is DecisionCockpitCounterfactual => c != null)
    : undefined;
  const world_constraints = normalizeWorldConstraintMaterialization(
    o.world_constraints ?? o.worldConstraints
  );
  const monte_carlo = normalizeMonteCarlo(o.monte_carlo ?? o.monteCarlo);

  const dto: DecisionCockpitDto = {
    version: asString(o.version) as DecisionCockpitDto['version'],
    integrity_badges,
    decision_trace_rows: decision_trace_rows?.length ? decision_trace_rows : undefined,
    risk_factors,
    grounded_factors,
    counterfactuals: counterfactuals?.length ? counterfactuals : undefined,
    world_constraints,
    monte_carlo,
    apis: normalizeApis(o.apis),
  };

  return hasDecisionCockpitUi(dto) ? dto : undefined;
}

export function pickDecisionCockpitFromRouteRun(
  res: RouteAndRunResponse
): DecisionCockpitDto | undefined {
  const explain = asRecord(res.explain);
  if (!explain) return undefined;
  return normalizeDecisionCockpit(explain.decision_cockpit ?? explain.decisionCockpit);
}

function hasRenderableWorldConstraints(
  wc: DecisionCockpitDto['world_constraints']
): boolean {
  if (!wc) return false;
  return Boolean(
    (typeof wc.applied_events === 'number' && wc.applied_events > 0) ||
      wc.road_ids?.length ||
      wc.weather_dates?.length
  );
}

export function hasDecisionCockpitUi(cockpit: DecisionCockpitDto | null | undefined): boolean {
  if (!cockpit) return false;
  return Boolean(
    cockpit.integrity_badges?.some(isMeaningfulIntegrityBadge) ||
      cockpit.decision_trace_rows?.some(isMeaningfulTraceRow) ||
      cockpit.risk_factors?.some(isMeaningfulRiskFactor) ||
      cockpit.grounded_factors?.some(isMeaningfulRiskFactor) ||
      cockpit.counterfactuals?.length ||
      hasRenderableWorldConstraints(cockpit.world_constraints) ||
      (cockpit.monte_carlo?.used && cockpit.monte_carlo.total_samples) ||
      cockpit.apis?.counterfactual?.trip_run_id
  );
}

export function integrityBadgeLabelZh(key: string): string {
  return INTEGRITY_BADGE_LABELS[key] ?? key;
}

export interface DecisionCockpitStripSummary {
  headline: string;
  subline?: string;
}

/** Decision Strip 摘要：integrity badge / trace / risk 投影 */
export function pickDecisionCockpitStripSummary(
  cockpit: DecisionCockpitDto | null | undefined,
): DecisionCockpitStripSummary | null {
  if (!cockpit || !hasDecisionCockpitUi(cockpit)) return null;

  const warnBadge = cockpit.integrity_badges?.find((badge) => {
    const status = (badge.status ?? '').toLowerCase();
    return status === 'warn' || status === 'warning' || status === 'fail' || status === 'failed';
  });
  if (warnBadge?.summary_zh?.trim()) {
    return {
      headline: warnBadge.summary_zh.trim(),
      subline: warnBadge.label_zh?.trim(),
    };
  }

  const trace = cockpit.decision_trace_rows?.find(
    (row) => row.summary_zh?.trim() || row.verdict?.trim(),
  );
  if (trace?.summary_zh?.trim()) {
    return {
      headline: trace.summary_zh.trim(),
      subline: trace.verdict?.trim() || trace.phase?.trim(),
    };
  }

  const risk = cockpit.risk_factors?.find((factor) => factor.label_zh?.trim());
  if (risk?.label_zh?.trim()) {
    return {
      headline: risk.label_zh.trim(),
      subline: risk.detail_zh?.trim(),
    };
  }

  const passBadge = cockpit.integrity_badges?.find((badge) => badge.summary_zh?.trim());
  if (passBadge?.summary_zh?.trim()) {
    return {
      headline: passBadge.summary_zh.trim(),
      subline: passBadge.label_zh?.trim(),
    };
  }

  return null;
}
