import type {
  PlanningDecisionCluster,
  PlanningDecisionClusterSummary,
  PlanningDecisionCostItem,
  PlanningDecisionCounterfactualRow,
  PlanningDecisionDataBasisItem,
  PlanningDecisionDiagnostic,
  PlanningDecisionExecutionStep,
  PlanningDecisionOutcomeItem,
  PlanningDecisionPack,
  PlanningDecisionPackOption,
  PlanningProposalMonitorView,
} from '@/dto/frontend-planning-decision-pack.types';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((n) => Number.isFinite(n));
}

import type { PlanningDecisionImpactScope } from '@/types/planning-decision-pack';

function normalizeImpactScope(raw: unknown): PlanningDecisionImpactScope | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;
  const scope = asString(record.scope);
  if (!scope) return undefined;
  return {
    scope: scope as PlanningDecisionImpactScope['scope'],
    affectedDays: asNumberArray(record.affectedDays ?? record.affected_days),
    itemIds: asStringArray(record.itemIds ?? record.item_ids),
    candidateIds: asStringArray(record.candidateIds ?? record.candidate_ids),
    placeIds: asNumberArray(record.placeIds ?? record.place_ids),
  };
}

function normalizeCounterfactualRow(raw: unknown): PlanningDecisionCounterfactualRow | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id) ?? 'cf';
  const label = asString(record.label);
  const before = asString(record.before);
  const after = asString(record.after);
  if (!label) return null;
  return {
    id,
    label,
    before: before ?? '—',
    after: after ?? '—',
  };
}

function normalizeActionRef(raw: unknown): PlanningDecisionPackOption['action'] {
  const record = readRecord(raw);
  if (!record) return undefined;
  const type = asString(record.type);
  if (!type) return undefined;
  return {
    type,
    proposalId: asString(record.proposalId ?? record.proposal_id),
    actionId: asString(record.actionId ?? record.action_id),
    ...record,
  };
}

function normalizeItemTone(value: unknown): PlanningDecisionOutcomeItem['tone'] | undefined {
  const raw = asString(value)?.toLowerCase();
  if (!raw) return undefined;
  if (raw === 'good' || raw === 'success' || raw === 'allow') return 'good';
  if (raw === 'caution' || raw === 'warn' || raw === 'warning' || raw === 'confirm') return 'caution';
  if (raw === 'risk' || raw === 'danger' || raw === 'reject' || raw === 'error') return 'risk';
  if (raw === 'neutral' || raw === 'info') return 'neutral';
  return undefined;
}

function normalizeDataBasisReliability(
  value: unknown,
): PlanningDecisionDataBasisItem['reliability'] | undefined {
  const raw = asString(value)?.toLowerCase();
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return undefined;
}

function normalizeOutcomeItem(raw: unknown): PlanningDecisionOutcomeItem | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text ? { text, tone: 'good' } : null;
  }
  const record = readRecord(raw);
  if (!record) return null;
  const text = asString(record.text ?? record.label ?? record.message);
  if (!text) return null;
  const id = asString(record.id);
  return {
    ...(id ? { id } : {}),
    text,
    tone: normalizeItemTone(record.tone) ?? 'good',
  };
}

function normalizeCostItem(raw: unknown): PlanningDecisionCostItem | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text ? { text, tone: 'caution' } : null;
  }
  const record = readRecord(raw);
  if (!record) return null;
  const text = asString(record.text ?? record.label ?? record.message);
  if (!text) return null;
  const id = asString(record.id);
  return {
    ...(id ? { id } : {}),
    text,
    tone: normalizeItemTone(record.tone) ?? 'caution',
  };
}

function normalizeDataBasisItem(raw: unknown): PlanningDecisionDataBasisItem | null {
  const record = readRecord(raw);
  if (!record) return null;
  const label = asString(record.label);
  if (!label) return null;
  const icon =
    asString(record.icon ?? record.iconKey ?? record.icon_key) ?? 'default';
  const id = asString(record.id);
  const reliability = normalizeDataBasisReliability(record.reliability);
  return {
    ...(id ? { id } : {}),
    icon,
    label,
    ...(reliability ? { reliability } : {}),
  };
}

function normalizeStructuredItems<T>(
  raw: unknown,
  normalizer: (item: unknown) => T | null,
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizer).filter(Boolean) as T[];
}

export function normalizePlanningDecisionPackOption(raw: unknown): PlanningDecisionPackOption | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  const headline = asString(record.headline);
  const title = asString(record.title) ?? headline;
  const optionKind = asString(record.optionKind ?? record.option_kind) ?? 'SHIFT_LATER';
  if (!id || !title) return null;

  const cfRaw = Array.isArray(record.counterfactualRows ?? record.counterfactual_rows)
    ? (record.counterfactualRows ?? record.counterfactual_rows)
    : [];

  const outcomeItems = normalizeStructuredItems(
    record.outcomeItems ?? record.outcome_items,
    normalizeOutcomeItem,
  );
  const costItems = normalizeStructuredItems(
    record.costItems ?? record.cost_items,
    normalizeCostItem,
  );
  const dataBasis = normalizeStructuredItems(
    record.dataBasis ?? record.data_basis,
    normalizeDataBasisItem,
  );

  return {
    id,
    optionKind: optionKind as PlanningDecisionPackOption['optionKind'],
    title,
    badge: asString(record.badge),
    letter: asString(record.letter),
    headline,
    description: asString(record.description),
    recommended: record.recommended === true,
    outcomes: asStringArray(record.outcomes).length
      ? asStringArray(record.outcomes)
      : outcomeItems.map((item) => item.text),
    costs: asStringArray(record.costs).length
      ? asStringArray(record.costs)
      : costItems.map((item) => item.text),
    outcomeItems: outcomeItems.length ? outcomeItems : undefined,
    costItems: costItems.length ? costItems : undefined,
    dataBasis: dataBasis.length ? dataBasis : undefined,
    impactScope: normalizeImpactScope(record.impactScope ?? record.impact_scope),
    counterfactualRows: cfRaw
      .map(normalizeCounterfactualRow)
      .filter(Boolean) as PlanningDecisionCounterfactualRow[],
    action: normalizeActionRef(record.action),
    systemJudgment: asString(record.systemJudgment ?? record.system_judgment),
  };
}

export function normalizePlanningDecisionCluster(raw: unknown): PlanningDecisionCluster | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id ?? record.clusterId ?? record.cluster_id);
  const title = asString(record.title);
  const decisionId = asString(record.decisionId ?? record.decision_id) ?? (id ? `decision_${id}` : undefined);
  if (!id || !title || !decisionId) return null;

  const optionsRaw = Array.isArray(record.options) ? record.options : [];
  const options = optionsRaw
    .map(normalizePlanningDecisionPackOption)
    .filter(Boolean) as PlanningDecisionPackOption[];

  return {
    id,
    title,
    dayNumbers: asNumberArray(record.dayNumbers ?? record.day_numbers ?? record.affectedDays),
    diagnosticCount: asNumber(record.diagnosticCount ?? record.diagnostic_count) ?? options.length,
    decisionId,
    dependsOn: asStringArray(record.dependsOn ?? record.depends_on),
    resolvesCount: asNumber(record.resolvesCount ?? record.resolves_count),
    processingKind: asString(record.processingKind ?? record.processing_kind),
    processingLabel: asString(record.processingLabel ?? record.processing_label),
    options,
  };
}

export function normalizePlanningDecisionClusterSummary(
  raw: unknown,
): PlanningDecisionClusterSummary | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id ?? record.clusterId);
  const title = asString(record.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    dayNumbers: asNumberArray(record.dayNumbers ?? record.day_numbers),
    diagnosticCount: asNumber(record.diagnosticCount ?? record.diagnostic_count),
    decisionId: asString(record.decisionId ?? record.decision_id),
    dependsOn: asStringArray(record.dependsOn ?? record.depends_on),
    resolvesCount: asNumber(record.resolvesCount ?? record.resolves_count),
    representativeOptionId: asString(
      record.representativeOptionId ?? record.representative_option_id,
    ),
    processingLabel: asString(record.processingLabel ?? record.processing_label),
  };
}

function normalizePlanningDecisionDiagnostic(raw: unknown): PlanningDecisionDiagnostic | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id ?? record.conflictId ?? record.conflict_id);
  const title = asString(record.title ?? record.message);
  if (!id || !title) return null;
  const severityRaw = asString(record.severity);
  const severity =
    severityRaw === 'info' || severityRaw === 'warn' || severityRaw === 'block'
      ? severityRaw
      : undefined;
  return {
    id,
    conflictId: asString(record.conflictId ?? record.conflict_id),
    source: asString(record.source) as PlanningDecisionDiagnostic['source'],
    title,
    message: asString(record.message ?? record.detail),
    dayIndex: asNumber(record.dayIndex ?? record.day_index),
    severity,
  };
}

export function normalizePlanningDecisionPack(raw: unknown): PlanningDecisionPack | undefined {
  const record = readRecord(raw);
  if (!record) return undefined;

  const optionsRaw = Array.isArray(record.options) ? record.options : [];
  const clustersRaw = Array.isArray(record.decisionClusters ?? record.decision_clusters)
    ? (record.decisionClusters ?? record.decision_clusters)
    : [];
  const diagnosticsRaw = Array.isArray(record.diagnostics) ? record.diagnostics : [];

  const pack: PlanningDecisionPack = {
    schema: (asString(record.schema) ?? 'tripnara.planning_decision_pack@v1') as PlanningDecisionPack['schema'],
    validUntil: asString(record.validUntil ?? record.valid_until),
    validityConstraint: asString(record.validityConstraint ?? record.validity_constraint),
    options: optionsRaw
      .map(normalizePlanningDecisionPackOption)
      .filter(Boolean) as PlanningDecisionPackOption[],
    decisionClusters: clustersRaw
      .map(normalizePlanningDecisionCluster)
      .filter(Boolean) as PlanningDecisionCluster[],
    diagnostics: diagnosticsRaw
      .map(normalizePlanningDecisionDiagnostic)
      .filter(Boolean) as PlanningDecisionDiagnostic[],
  };

  if (
    !pack.options?.length &&
    !pack.decisionClusters?.length &&
    !pack.diagnostics?.length &&
    !pack.validUntil
  ) {
    return undefined;
  }
  return pack;
}

export function normalizePlanningDecisionExecutionSteps(
  raw: unknown,
): PlanningDecisionExecutionStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const record = readRecord(item);
      if (!record) return null;
      const label = asString(record.label) ?? asString(record.text);
      if (!label) return null;
      const statusRaw = asString(record.status) ?? 'done';
      const status =
        statusRaw === 'pending' ||
        statusRaw === 'running' ||
        statusRaw === 'done' ||
        statusRaw === 'failed'
          ? statusRaw
          : 'done';
      return {
        id: asString(record.id) ?? `step_${index}`,
        label,
        status,
      };
    })
    .filter(Boolean) as PlanningDecisionExecutionStep[];
}

export function normalizePlanningProposalMonitor(raw: unknown): PlanningProposalMonitorView {
  const record = readRecord(raw) ?? {};
  return {
    validUntil: asString(record.validUntil ?? record.valid_until),
    contextVersion: asNumber(record.contextVersion ?? record.context_version) ?? 0,
    isStale: record.isStale === true || record.is_stale === true,
    monitorWebhookUrl: asString(record.monitorWebhookUrl ?? record.monitor_webhook_url),
    staleReason: asString(record.staleReason ?? record.stale_reason),
  };
}
