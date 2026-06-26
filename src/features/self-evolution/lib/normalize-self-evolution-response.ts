import type {
  CalibrationCurve,
  ColdStartConfig,
  ColdStartStatus,
  CompanionCalibrationRecord,
  EpisodicMemory,
  SemanticMemory,
  TripOutcomeResponse,
} from '@/types/self-evolution';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeTripOutcomeResponse(raw: unknown): TripOutcomeResponse {
  const data = asRecord(raw) ?? {};
  const dimensions = asRecord(data.dimensions) ?? {};
  const weights = asRecord(data.weights) ?? {};
  const expectationGap = asRecord(data.expectationGap ?? data.expectation_gap) ?? {};
  const groupAggregation =
    asRecord(data.groupAggregation ?? data.group_aggregation) ?? {};

  const dim = (camel: string, snake: string) => {
    const block = asRecord(dimensions[camel] ?? dimensions[snake]) ?? {};
    return { score: num(block.score) };
  };

  return {
    tripId: String(data.tripId ?? data.trip_id ?? ''),
    dimensions: {
      overallSatisfaction: dim('overallSatisfaction', 'overall_satisfaction'),
      companionSatisfaction: dim('companionSatisfaction', 'companion_satisfaction'),
      budgetAccuracy: dim('budgetAccuracy', 'budget_accuracy'),
      completionQuality: dim('completionQuality', 'completion_quality'),
      safety: dim('safety', 'safety'),
      repurchase: dim('repurchase', 'repurchase'),
    },
    overallScore: num(data.overallScore ?? data.overall_score),
    expectationGap: { gap: num(expectationGap.gap) },
    groupAggregation: {
      strategy: String(groupAggregation.strategy ?? 'unknown'),
      aggregatedScore: num(groupAggregation.aggregatedScore ?? groupAggregation.aggregated_score),
      satisfiedMembers: (groupAggregation.satisfiedMembers ??
        groupAggregation.satisfied_members ??
        []) as string[],
      unsatisfiedMembers: (groupAggregation.unsatisfiedMembers ??
        groupAggregation.unsatisfied_members ??
        []) as string[],
    },
    weights: {
      overallSatisfaction: num(weights.overallSatisfaction ?? weights.overall_satisfaction, 0.25),
      companionSatisfaction: num(weights.companionSatisfaction ?? weights.companion_satisfaction, 0.2),
      budgetAccuracy: num(weights.budgetAccuracy ?? weights.budget_accuracy, 0.15),
      completionQuality: num(weights.completionQuality ?? weights.completion_quality, 0.15),
      safety: num(weights.safety, 0.15),
      repurchase: num(weights.repurchase, 0.1),
    },
  };
}

export function normalizeEpisodicMemory(raw: unknown): EpisodicMemory {
  const data = asRecord(raw) ?? {};
  const seasonality =
    asRecord(data.seasonalityFactor ?? data.seasonality_factor) ?? {};
  return {
    id: String(data.id ?? ''),
    userId: String(data.userId ?? data.user_id ?? ''),
    tripId: String(data.tripId ?? data.trip_id ?? ''),
    content: String(data.content ?? ''),
    activationScore: num(data.activationScore ?? data.activation_score),
    seasonalityFactor: {
      season: String(seasonality.season ?? 'unknown'),
      activation: num(seasonality.activation),
    },
    confidence: num(data.confidence),
    createdAt: String(data.createdAt ?? data.created_at ?? new Date().toISOString()),
  };
}

export function normalizeEpisodicMemories(raw: unknown): EpisodicMemory[] {
  if (Array.isArray(raw)) return raw.map(normalizeEpisodicMemory);
  const data = asRecord(raw);
  const items = data?.items ?? data?.memories;
  return Array.isArray(items) ? items.map(normalizeEpisodicMemory) : [];
}

export function normalizeSemanticMemory(raw: unknown): SemanticMemory {
  const data = asRecord(raw) ?? {};
  const metadata = asRecord(data.metadata) ?? {};
  return {
    id: String(data.id ?? ''),
    userId: String(data.userId ?? data.user_id ?? ''),
    content: String(data.content ?? ''),
    confidence: num(data.confidence),
    sourceMemoryIds: (data.sourceMemoryIds ?? data.source_memory_ids ?? []) as string[],
    metadata: {
      pattern: String(metadata.pattern ?? 'unknown'),
      frequency: num(metadata.frequency),
    },
  };
}

export function normalizeSemanticMemories(raw: unknown): SemanticMemory[] {
  if (Array.isArray(raw)) return raw.map(normalizeSemanticMemory);
  const data = asRecord(raw);
  const items = data?.items ?? data?.memories;
  return Array.isArray(items) ? items.map(normalizeSemanticMemory) : [];
}

export function normalizeCalibrationCurve(raw: unknown): CalibrationCurve {
  const data = asRecord(raw) ?? {};
  return {
    dimension: String(data.dimension ?? ''),
    accuracy: num(data.accuracy),
    sampleCount: data.sampleCount != null ? num(data.sampleCount) : num(data.sample_count),
    lastUpdated:
      data.lastUpdated != null
        ? String(data.lastUpdated)
        : data.last_updated != null
          ? String(data.last_updated)
          : undefined,
  };
}

export function normalizeCalibrationCurves(raw: unknown): Record<string, CalibrationCurve> {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw.map((item) => {
        const curve = normalizeCalibrationCurve(item);
        return [curve.dimension, curve];
      })
    );
  }
  const data = asRecord(raw);
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const curve = normalizeCalibrationCurve(value);
      return [curve.dimension || key, curve];
    })
  );
}

export function normalizeColdStartStatus(raw: unknown): ColdStartStatus {
  const data = asRecord(raw) ?? {};
  return {
    userId: String(data.userId ?? data.user_id ?? ''),
    phase: String(data.phase ?? 'questionnaire'),
    tripCount: num(data.tripCount ?? data.trip_count),
  };
}

export function normalizeColdStartConfig(raw: unknown): ColdStartConfig {
  const data = asRecord(raw) ?? {};
  return {
    questionnaireThreshold: num(data.questionnaireThreshold ?? data.questionnaire_threshold),
    heuristicThreshold: num(data.heuristicThreshold ?? data.heuristic_threshold, 2),
    offlineShapleyThreshold: num(
      data.offlineShapleyThreshold ?? data.offline_shapley_threshold,
      6
    ),
    realtimeCalibrationThreshold: num(
      data.realtimeCalibrationThreshold ?? data.realtime_calibration_threshold,
      11
    ),
  };
}

export function normalizeCalibrationRecord(raw: unknown): CompanionCalibrationRecord {
  const data = asRecord(raw) ?? {};
  return {
    id: data.id != null ? String(data.id) : undefined,
    postId: String(data.postId ?? data.post_id ?? ''),
    applicationId: String(data.applicationId ?? data.application_id ?? ''),
    preTripPrediction: num(data.preTripPrediction ?? data.pre_trip_prediction),
    postTripSatisfaction: num(data.postTripSatisfaction ?? data.post_trip_satisfaction),
    dimensionPredictions: (data.dimensionPredictions ??
      data.dimension_predictions) as CompanionCalibrationRecord['dimensionPredictions'],
    dimensionSatisfactions: (data.dimensionSatisfactions ??
      data.dimension_satisfactions) as CompanionCalibrationRecord['dimensionSatisfactions'],
    tripId: data.tripId != null ? String(data.tripId) : data.trip_id != null ? String(data.trip_id) : undefined,
    createdAt:
      data.createdAt != null
        ? String(data.createdAt)
        : data.created_at != null
          ? String(data.created_at)
          : undefined,
  };
}

export function normalizeCalibrationRecords(raw: unknown): CompanionCalibrationRecord[] {
  if (Array.isArray(raw)) return raw.map(normalizeCalibrationRecord);
  const data = asRecord(raw);
  const items = data?.items ?? data?.records;
  return Array.isArray(items) ? items.map(normalizeCalibrationRecord) : [];
}
