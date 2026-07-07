import type {
  PlanningDecisionBasis,
  PlanningDecisionBasisContextField,
  PlanningDecisionBasisWhatHappened,
} from '@/dto/frontend-planning-decision-basis.types';

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

function asDisplayString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asString(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** 兼容 { data: basis } 或已解包 payload */
function peelBasisPayload(raw: unknown): Record<string, unknown> {
  const record = readRecord(raw);
  if (!record) return {};

  const hasBasisShape =
    asString(record.schema)?.includes('planning_decision_basis') ||
    Array.isArray(record.contextFields) ||
    Array.isArray(record.context_fields);

  if (hasBasisShape) return record;

  const nested = readRecord(record.data);
  if (
    nested &&
    (asString(nested.schema)?.includes('planning_decision_basis') ||
      Array.isArray(nested.contextFields) ||
      Array.isArray(nested.context_fields))
  ) {
    return nested;
  }

  const decisionBasis = readRecord(record.decisionBasis ?? record.decision_basis);
  if (decisionBasis) return decisionBasis;

  return record;
}

function normalizeWhatHappened(raw: unknown): PlanningDecisionBasisWhatHappened | null {
  const record = readRecord(raw);
  if (!record) return null;
  const narrative = asString(record.narrative);
  if (!narrative) return null;
  return {
    headline: asString(record.headline),
    narrative,
    dayIndex: asNumber(record.dayIndex ?? record.day_index),
  };
}

function normalizeContextField(raw: unknown, index: number): PlanningDecisionBasisContextField | null {
  const record = readRecord(raw);
  if (!record) return null;
  const label = asString(record.label ?? record.name ?? record.title);
  const value = asDisplayString(record.value ?? record.displayValue ?? record.display_value ?? record.text);
  if (!label || !value) return null;
  return {
    id: asString(record.id) ?? `field_${index}`,
    key: asString(record.key),
    label,
    value,
    subtext: asString(record.subtext ?? record.sub_text ?? record.hint),
    icon: asString(record.icon ?? record.iconKey ?? record.icon_key) as PlanningDecisionBasisContextField['icon'],
    tone: asString(record.tone) as PlanningDecisionBasisContextField['tone'],
  };
}

function normalizeStructuredFields(raw: unknown): PlanningDecisionBasisContextField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeContextField)
    .filter(Boolean) as PlanningDecisionBasisContextField[];
}

export function normalizePlanningDecisionBasis(raw: unknown, tripId: string): PlanningDecisionBasis {
  const record = peelBasisPayload(raw);
  const whatHappened =
    normalizeWhatHappened(record.whatHappened ?? record.what_happened) ?? {
      narrative: '',
    };

  const contextFields = normalizeStructuredFields(record.contextFields ?? record.context_fields);

  return {
    schema: (asString(record.schema) ?? 'tripnara.planning_decision_basis@v1') as PlanningDecisionBasis['schema'],
    tripId: asString(record.tripId ?? record.trip_id) ?? tripId,
    conflictId: asString(record.conflictId ?? record.conflict_id),
    proposalId: asString(record.proposalId ?? record.proposal_id),
    whatHappened,
    contextFields,
    dataValidUntil: asString(record.dataValidUntil ?? record.data_valid_until),
    updatedAt: asString(record.updatedAt ?? record.updated_at),
    optionCount: asNumber(record.optionCount ?? record.option_count),
    refreshUrl: asString(record.refreshUrl ?? record.refresh_url),
  };
}
