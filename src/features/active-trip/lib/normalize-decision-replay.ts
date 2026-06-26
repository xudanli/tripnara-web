import type {
  DecisionReplayPersonaId,
  DecisionReplayResponse,
  DecisionReplayTimelineEntry,
  FlywheelAuditAssertion,
  FlywheelAuditReport,
  FlywheelAuditSignals,
} from '@/types/active-trip-decision-replay';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizePersonaId(raw: unknown): DecisionReplayPersonaId {
  const value = asString(raw).toLowerCase();
  if (value === 'dre' || value === 'drdre' || value === 'dr_dre') return 'drDre';
  if (value === 'neptune') return 'neptune';
  return 'abu';
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return undefined;
}

function normalizeFlywheelAuditSignals(raw: unknown): FlywheelAuditSignals {
  const record = asRecord(raw);
  if (!record) return {};

  const signals: FlywheelAuditSignals = {};
  for (const [key, value] of Object.entries(record)) {
    const parsed = asBoolean(value);
    if (parsed !== undefined) signals[key] = parsed;
  }
  return signals;
}

function normalizeFlywheelAuditAssertion(raw: unknown, index: number): FlywheelAuditAssertion | null {
  const record = asRecord(raw);
  if (!record) return null;

  const message = asString(record.message ?? record.detail ?? record.label);
  if (!message) return null;

  return {
    id: asString(record.id, `assertion-${index}`),
    passed: asBoolean(record.passed ?? record.ok) ?? false,
    message,
  };
}

function normalizeFlywheelAuditReport(
  raw: unknown,
  tripIdFallback?: string
): FlywheelAuditReport | null {
  if (raw == null) return null;
  const record = asRecord(raw);
  if (!record) return null;

  const snapshotId = asString(record.snapshotId ?? record.snapshot_id);
  const applicationId = asString(record.applicationId ?? record.application_id);
  const tripId = asString(record.tripId ?? record.trip_id, tripIdFallback ?? '');
  const predictionFingerprint = asString(
    record.predictionFingerprint ?? record.prediction_fingerprint
  );
  const observationFingerprint = asString(
    record.observationFingerprint ?? record.observation_fingerprint
  );

  if (!snapshotId && !predictionFingerprint && !observationFingerprint) return null;

  const assertionsRaw = record.assertions ?? record.audit_assertions;
  const assertions = Array.isArray(assertionsRaw)
    ? assertionsRaw
        .map(normalizeFlywheelAuditAssertion)
        .filter((item): item is FlywheelAuditAssertion => item != null)
    : [];

  const matchValue = asBoolean(record.match ?? record.aligned ?? record.isMatch ?? record.is_match);

  return {
    snapshotId: snapshotId || `snapshot-${tripId || 'unknown'}`,
    applicationId,
    tripId,
    match: matchValue ?? false,
    predictionFingerprint,
    observationFingerprint,
    comparablePredictionFp: asString(
      record.comparablePredictionFp ??
        record.comparable_prediction_fp ??
        predictionFingerprint
    ),
    comparableObservationFp: asString(
      record.comparableObservationFp ??
        record.comparable_observation_fp ??
        observationFingerprint
    ),
    signals: normalizeFlywheelAuditSignals(record.signals),
    assertions,
    note: asString(record.note ?? record.summary) || undefined,
  };
}

function normalizeTimelineEntry(
  raw: unknown,
  index: number
): DecisionReplayTimelineEntry | null {
  const record = asRecord(raw);
  if (!record) return null;

  const kindRaw = asString(record.kind);
  const kind: DecisionReplayTimelineEntry['kind'] =
    kindRaw === 'instantiate' ||
    kindRaw === 'task_confirmed' ||
    kindRaw === 'task_rollback' ||
    kindRaw === 'rollback_proposal' ||
    kindRaw === 'vault_authorize'
      ? kindRaw
      : 'instantiate';

  const labelZh = asString(record.labelZh ?? record.label_zh);
  const at = asString(record.at ?? record.timestamp ?? record.createdAt ?? record.created_at);
  if (!labelZh && !at) return null;

  return {
    id: asString(record.id, `replay-${index}`),
    at: at || new Date().toISOString(),
    labelZh: labelZh || '决策事件',
    kind,
  };
}

function normalizePersonaSection(
  raw: unknown,
  fallbackPersona?: DecisionReplayPersonaId
): DecisionReplayResponse['personaSections'][number] | null {
  const record = asRecord(raw);
  if (!record) return null;

  const titleZh = asString(record.titleZh ?? record.title_zh ?? record.title);
  const bodyZh = asString(record.bodyZh ?? record.body_zh ?? record.body ?? record.narrative);
  if (!titleZh && !bodyZh) return null;

  return {
    persona: normalizePersonaId(record.persona ?? record.persona_id ?? fallbackPersona),
    titleZh: titleZh || '决策视角',
    bodyZh: bodyZh || '',
  };
}

function normalizePersonaSections(raw: unknown): DecisionReplayResponse['personaSections'] {
  if (Array.isArray(raw)) {
    return raw
      .map((item, _index) => normalizePersonaSection(item))
      .filter((item): item is NonNullable<typeof item> => item != null);
  }

  const record = asRecord(raw);
  if (!record) return [];

  return Object.entries(record)
    .map(([key, value]) => normalizePersonaSection(value, normalizePersonaId(key)))
    .filter((item): item is NonNullable<typeof item> => item != null);
}

/** GET /api/trips/:tripId/decision-replay */
export function normalizeDecisionReplay(
  raw: unknown,
  tripIdFallback?: string
): DecisionReplayResponse {
  const record = asRecord(raw);
  if (!record) {
    return {
      tripId: tripIdFallback ?? '',
      timeline: [],
      abuNarrative: '',
      personaSections: [],
      flywheelAuditReport: null,
    };
  }

  const nested = asRecord(record.replay ?? record.decisionReplay ?? record.decision_replay);
  const source = nested ?? record;

  const timelineRaw = source.timeline ?? source.events ?? source.decision_timeline;
  const timeline = Array.isArray(timelineRaw)
    ? timelineRaw
        .map(normalizeTimelineEntry)
        .filter((item): item is DecisionReplayTimelineEntry => item != null)
    : [];

  const personaSections = normalizePersonaSections(
    source.personaSections ?? source.persona_sections
  );

  return {
    tripId: asString(source.tripId ?? source.trip_id, tripIdFallback ?? ''),
    timeline,
    abuNarrative: asString(source.abuNarrative ?? source.abu_narrative),
    personaSections,
    flywheelAuditReport: normalizeFlywheelAuditReport(
      source.flywheelAuditReport ??
        source.flywheel_audit_report ??
        source.flywheelAudit ??
        source.flywheel_audit,
      tripIdFallback
    ),
  };
}
