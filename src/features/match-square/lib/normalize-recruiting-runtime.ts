import type {
  RecruitingAttribution,
  RecruitingAttributionConfidence,
  RecruitingAttributionCauseType,
  RecruitingOutcome,
  RecruitingOutcomeSuccessLevel,
  RecruitingPrimaryReason,
} from '@/types/match-square';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const CAUSE_TYPES = new Set<RecruitingAttributionCauseType>([
  'USER_ACTION',
  'CONSTRAINT',
  'GOVERNANCE',
  'SYSTEM',
]);

const PRIMARY_REASONS = new Set<RecruitingPrimaryReason>([
  'COMPATIBILITY_MATCH',
  'SKILL_REQUIREMENT',
  'SCHEDULE_ALIGNMENT',
  'BUDGET_ALIGNMENT',
  'PERSONA_FIT',
  'CAPTAIN_PREFERENCE',
  'SLOT_REQUIREMENT',
  'TEAM_BALANCE',
  'EXTERNAL_FACTOR',
  'GOVERNANCE',
  'REPUTATION_SCORE',
  'PAST_COLLABORATION',
]);

const CONFIDENCE_LEVELS = new Set<RecruitingAttributionConfidence>(['HIGH', 'MEDIUM', 'LOW']);

const SUCCESS_LEVELS = new Set<RecruitingOutcomeSuccessLevel>([
  'EXCELLENT',
  'GOOD',
  'ACCEPTABLE',
  'POOR',
  'FAILED',
]);

export function normalizeRecruitingAttribution(raw: unknown): RecruitingAttribution | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const causeTypeRaw = asString(record.causeType ?? record.cause_type, 'USER_ACTION');
  const primaryReasonRaw = asString(record.primaryReason ?? record.primary_reason, 'COMPATIBILITY_MATCH');
  const confidenceRaw = asString(record.confidence, 'MEDIUM');

  const signalScoresRaw = record.signalScores ?? record.signal_scores;
  const signalScores: Record<string, number> = {};
  if (signalScoresRaw && typeof signalScoresRaw === 'object') {
    for (const [key, value] of Object.entries(signalScoresRaw as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        signalScores[key] = value;
      }
    }
  }

  const reasonCodesRaw = record.reasonCodes ?? record.reason_codes;
  const reasonCodes = Array.isArray(reasonCodesRaw)
    ? reasonCodesRaw.filter((x): x is string => typeof x === 'string')
    : [];

  const metadataRaw = record.metadata;
  let metadata: RecruitingAttribution['metadata'];
  if (metadataRaw && typeof metadataRaw === 'object') {
    const meta = metadataRaw as Record<string, unknown>;
    const altRaw = meta.alternativeReasons ?? meta.alternative_reasons;
    metadata = {
      ruleId: asNullableString(meta.ruleId ?? meta.rule_id) ?? undefined,
      alternativeReasons: Array.isArray(altRaw)
        ? altRaw.filter((x): x is string => typeof x === 'string')
        : undefined,
      compatibilityScore: asNumber(meta.compatibilityScore ?? meta.compatibility_score, NaN) || undefined,
      skillMatchScore: asNumber(meta.skillMatchScore ?? meta.skill_match_score, NaN) || undefined,
      scheduleMatchScore: asNumber(meta.scheduleMatchScore ?? meta.schedule_match_score, NaN) || undefined,
      budgetMatchScore: asNumber(meta.budgetMatchScore ?? meta.budget_match_score, NaN) || undefined,
    };
  }

  if (!reasonCodes.length && !Object.keys(signalScores).length && !primaryReasonRaw) {
    return null;
  }

  return {
    causeType: CAUSE_TYPES.has(causeTypeRaw as RecruitingAttributionCauseType)
      ? (causeTypeRaw as RecruitingAttributionCauseType)
      : 'USER_ACTION',
    primaryReason: PRIMARY_REASONS.has(primaryReasonRaw as RecruitingPrimaryReason)
      ? (primaryReasonRaw as RecruitingPrimaryReason)
      : 'COMPATIBILITY_MATCH',
    reasonCodes,
    signalScores,
    confidence: CONFIDENCE_LEVELS.has(confidenceRaw as RecruitingAttributionConfidence)
      ? (confidenceRaw as RecruitingAttributionConfidence)
      : 'MEDIUM',
    metadata,
  };
}

export function normalizeRecruitingOutcome(raw: unknown): RecruitingOutcome | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const id = asString(record.id);
  const postId = asString(record.postId ?? record.post_id);
  if (!id && !postId) return null;

  const successLevelRaw = asString(record.successLevel ?? record.success_level, 'ACCEPTABLE');
  const metricsRaw = record.metrics;
  const metricsRecord =
    metricsRaw && typeof metricsRaw === 'object' ? (metricsRaw as Record<string, unknown>) : {};

  const factorsRaw = record.factors;
  const factors = Array.isArray(factorsRaw)
    ? factorsRaw
        .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
        .map((f) => ({
          type: asString(f.type),
          impact: asNumber(f.impact, 0),
          description: asString(f.description),
          details:
            f.details && typeof f.details === 'object'
              ? (f.details as Record<string, unknown>)
              : undefined,
        }))
        .filter((f) => f.type || f.description)
    : [];

  const recommendationsRaw = record.recommendations;
  const recommendations = Array.isArray(recommendationsRaw)
    ? recommendationsRaw.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    id: id || postId,
    postId: postId || id,
    tripId: asNullableString(record.tripId ?? record.trip_id) ?? undefined,
    successLevel: SUCCESS_LEVELS.has(successLevelRaw as RecruitingOutcomeSuccessLevel)
      ? (successLevelRaw as RecruitingOutcomeSuccessLevel)
      : 'ACCEPTABLE',
    metrics: {
      timeToFill: asNumber(metricsRecord.timeToFill ?? metricsRecord.time_to_fill),
      applicationCount: asNumber(metricsRecord.applicationCount ?? metricsRecord.application_count),
      approvedCount: asNumber(metricsRecord.approvedCount ?? metricsRecord.approved_count),
      rejectedCount: asNumber(metricsRecord.rejectedCount ?? metricsRecord.rejected_count),
      conversionRate: asNumber(metricsRecord.conversionRate ?? metricsRecord.conversion_rate),
      matchSuccessRate: asNumber(metricsRecord.matchSuccessRate ?? metricsRecord.match_success_rate),
      teamPerformance: asNumber(metricsRecord.teamPerformance ?? metricsRecord.team_performance),
      attritionRate: asNumber(metricsRecord.attritionRate ?? metricsRecord.attrition_rate),
    },
    factors,
    recommendations,
    computedAt: asString(record.computedAt ?? record.computed_at, new Date().toISOString()),
    dataQuality: asNumber(record.dataQuality ?? record.data_quality, 0.5),
    confidence: asNumber(record.confidence, 0.5),
  };
}
