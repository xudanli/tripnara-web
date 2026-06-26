import {
  ColdStartPhase,
  CompatibilityDimension,
  type CalibrationCurve,
  type CalibrationRecordRequest,
  type ColdStartConfig,
  type ColdStartStatus,
  type CompanionCalibrationRecord,
  type EpisodicMemory,
  type EpisodicMemoryRequest,
  type SemanticMemory,
  type SemanticMemoryReflectionRequest,
  type LifeEventType,
  type TripOutcomeRequest,
  type TripOutcomeResponse,
} from '@/types/self-evolution';

const MOCK_EPISODIC: EpisodicMemory[] = [
  {
    id: 'ep-1',
    userId: 'demo-user',
    tripId: 'trip-demo-1',
    content: '冰岛环岛：天气多变但团队配合默契，南岸瀑布与黑沙滩印象最深刻。',
    activationScore: 0.82,
    seasonalityFactor: { season: 'summer', activation: 0.75 },
    confidence: 0.78,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'ep-2',
    userId: 'demo-user',
    tripId: 'trip-demo-2',
    content: '日本关西：节奏偏慢，美食探索占主导，预算控制良好。',
    activationScore: 0.71,
    seasonalityFactor: { season: 'spring', activation: 0.68 },
    confidence: 0.72,
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
];

const MOCK_SEMANTIC: SemanticMemory[] = [
  {
    id: 'sem-1',
    userId: 'demo-user',
    content: '偏好自然风景与适度冒险，对极端天气有较高容忍度。',
    confidence: 0.85,
    sourceMemoryIds: ['ep-1'],
    metadata: { pattern: 'nature_adventure', frequency: 3 },
  },
  {
    id: 'sem-2',
    userId: 'demo-user',
    content: '美食导向型旅行者，愿意在餐饮上适度超支。',
    confidence: 0.74,
    sourceMemoryIds: ['ep-2'],
    metadata: { pattern: 'food_focus', frequency: 2 },
  },
];

const MOCK_CURVES: Record<string, CalibrationCurve> = {
  [CompatibilityDimension.BUDGET]: { dimension: 'budget', accuracy: 0.72, sampleCount: 18 },
  [CompatibilityDimension.TRAVEL_PACE]: { dimension: 'travel_pace', accuracy: 0.68, sampleCount: 15 },
  [CompatibilityDimension.INTERACTION_MODE]: {
    dimension: 'interaction_mode',
    accuracy: 0.81,
    sampleCount: 22,
  },
  [CompatibilityDimension.RISK_TOLERANCE]: {
    dimension: 'risk_tolerance',
    accuracy: 0.65,
    sampleCount: 12,
  },
  [CompatibilityDimension.SOCIAL_STYLE]: { dimension: 'social_style', accuracy: 0.77, sampleCount: 20 },
};

const outcomeCache = new Map<string, TripOutcomeResponse>();
const calibrationRecords: CompanionCalibrationRecord[] = [];
const tripCounts = new Map<string, number>();

function computeOutcome(
  tripId: string,
  data: Omit<TripOutcomeRequest, 'tripId'>
): TripOutcomeResponse {
  const q = data.questionnaireResponses;
  const satNorm = (q.overallSatisfaction - 1) / 6;
  const budgetAcc =
    data.plannedBudget > 0
      ? 1 - Math.min(1, Math.abs(data.actualSpent - data.plannedBudget) / data.plannedBudget)
      : 0.7;
  const completion =
    data.plannedActivities > 0
      ? (data.completedActivities.p0 + data.completedActivities.p1 * 0.5) / data.plannedActivities
      : 0.8;
  const safety = data.hasAccidents ? 0.4 : Math.max(0.5, 1 - data.stressEventCount * 0.08);
  const repurchase = (q.willingnessToTravelAgain - 1) / 6;
  const companion = (q.groupDynamics - 1) / 6;

  const dimensions = {
    overallSatisfaction: { score: satNorm },
    companionSatisfaction: { score: companion },
    budgetAccuracy: { score: budgetAcc },
    completionQuality: { score: Math.min(1, completion) },
    safety: { score: safety },
    repurchase: { score: repurchase },
  };

  const weights = {
    overallSatisfaction: 0.25,
    companionSatisfaction: 0.2,
    budgetAccuracy: 0.15,
    completionQuality: 0.15,
    safety: 0.15,
    repurchase: 0.1,
  };

  const overallScore =
    dimensions.overallSatisfaction.score * weights.overallSatisfaction +
    dimensions.companionSatisfaction.score * weights.companionSatisfaction +
    dimensions.budgetAccuracy.score * weights.budgetAccuracy +
    dimensions.completionQuality.score * weights.completionQuality +
    dimensions.safety.score * weights.safety +
    dimensions.repurchase.score * weights.repurchase;

  const gap = overallScore - (data.preTripExpectation - 1) / 6;

  return {
    tripId,
    dimensions,
    overallScore,
    expectationGap: { gap },
    groupAggregation: {
      strategy: 'weighted_mean',
      aggregatedScore: overallScore,
      satisfiedMembers: data.userIds.filter(() => overallScore >= 0.6),
      unsatisfiedMembers: data.userIds.filter(() => overallScore < 0.6),
    },
    weights,
  };
}

export const selfEvolutionMockStore = {
  calculateOutcome(tripId: string, data: Omit<TripOutcomeRequest, 'tripId'>): TripOutcomeResponse {
    const result = computeOutcome(tripId, data);
    outcomeCache.set(tripId, result);
    return result;
  },

  calculateBatch(requests: TripOutcomeRequest[]): TripOutcomeResponse[] {
    return requests.map((r) => this.calculateOutcome(r.tripId, r));
  },

  generateEpisodicMemory(data: EpisodicMemoryRequest): EpisodicMemory {
    const memory: EpisodicMemory = {
      id: `ep-mock-${Date.now()}`,
      userId: data.userId,
      tripId: data.tripId,
      content: `行程 ${data.tripId.slice(0, 8)} 的回忆：整体满意度 ${(data.outcome.overallSatisfaction.score * 100).toFixed(0)}%`,
      activationScore: 0.75,
      seasonalityFactor: { season: 'unknown', activation: 0.7 },
      confidence: 0.7,
      createdAt: new Date().toISOString(),
    };
    MOCK_EPISODIC.unshift(memory);
    return memory;
  },

  retrieveEpisodicMemories(
    userId: string,
    params?: { topK?: number; minActivationScore?: number; season?: string }
  ): EpisodicMemory[] {
    let list = MOCK_EPISODIC.filter((m) => m.userId === userId || userId === 'demo-user');
    if (params?.minActivationScore != null) {
      list = list.filter((m) => m.activationScore >= params.minActivationScore!);
    }
    if (params?.season) {
      list = list.filter((m) => m.seasonalityFactor.season === params.season);
    }
    return list.slice(0, params?.topK ?? 10);
  },

  resetOnLifeEvent(_userId: string, _eventType: LifeEventType): void {
    /* mock no-op */
  },

  applySocialCorrection(_memoryId: string, _companionId: string, _correctionFactor: number): void {
    /* mock no-op */
  },

  reflect(data: SemanticMemoryReflectionRequest): SemanticMemory[] {
    if (!data.episodicMemories.length) return [];
    const memory: SemanticMemory = {
      id: `sem-mock-${Date.now()}`,
      userId: data.userId,
      content: `从 ${data.episodicMemories.length} 次旅行中归纳：偏好稳定，重视团队默契。`,
      confidence: 0.7,
      sourceMemoryIds: data.episodicMemories.map((m) => m.id),
      metadata: { pattern: 'team_cohesion', frequency: data.episodicMemories.length },
    };
    MOCK_SEMANTIC.unshift(memory);
    return [memory];
  },

  retrieveSemanticMemories(
    userId: string,
    params?: { topK?: number; minConfidence?: number; pattern?: string }
  ): SemanticMemory[] {
    let list = MOCK_SEMANTIC.filter((m) => m.userId === userId || userId === 'demo-user');
    if (params?.minConfidence != null) {
      list = list.filter((m) => m.confidence >= params.minConfidence!);
    }
    if (params?.pattern) {
      list = list.filter((m) => m.metadata.pattern.includes(params.pattern!));
    }
    return list.slice(0, params?.topK ?? 10);
  },

  updateSemanticMemory(memoryId: string, updates: Partial<SemanticMemory>): SemanticMemory {
    const idx = MOCK_SEMANTIC.findIndex((m) => m.id === memoryId);
    if (idx >= 0) {
      MOCK_SEMANTIC[idx] = { ...MOCK_SEMANTIC[idx], ...updates };
      return MOCK_SEMANTIC[idx];
    }
    throw new Error('Memory not found');
  },

  mergeSemanticMemories(memoryIds: string[]): SemanticMemory {
    const merged: SemanticMemory = {
      id: `sem-merged-${Date.now()}`,
      userId: MOCK_SEMANTIC[0]?.userId ?? 'demo-user',
      content: '合并后的偏好模式',
      confidence: 0.8,
      sourceMemoryIds: memoryIds,
      metadata: { pattern: 'merged', frequency: memoryIds.length },
    };
    MOCK_SEMANTIC.unshift(merged);
    return merged;
  },

  scheduleReflection(_userId: string, _episodicMemoryIds: string[]): void {
    /* mock no-op */
  },

  recordCalibration(data: CalibrationRecordRequest): CompanionCalibrationRecord {
    const record: CompanionCalibrationRecord = {
      ...data,
      id: `cal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    calibrationRecords.push(record);
    return record;
  },

  recordCalibrationBatch(requests: CalibrationRecordRequest[]): CompanionCalibrationRecord[] {
    return requests.map((r) => this.recordCalibration(r));
  },

  getCalibrationCurve(dimension: string): CalibrationCurve {
    return (
      MOCK_CURVES[dimension] ?? {
        dimension,
        accuracy: 0.6,
        sampleCount: 5,
      }
    );
  },

  getAllCalibrationCurves(): Record<string, CalibrationCurve> {
    return { ...MOCK_CURVES };
  },

  applyCalibration(_dimension: string, prediction: number): number {
    return Math.min(1, prediction * 0.95 + 0.05);
  },

  getTripCalibrationRecords(tripId: string): CompanionCalibrationRecord[] {
    return calibrationRecords.filter((r) => r.tripId === tripId);
  },

  getAllCalibrationRecords(): CompanionCalibrationRecord[] {
    return [...calibrationRecords];
  },

  getColdStartPhase(userId: string): ColdStartStatus {
    const tripCount = tripCounts.get(userId) ?? 3;
    let phase = ColdStartPhase.QUESTIONNAIRE;
    if (tripCount >= 11) phase = ColdStartPhase.REALTIME_CALIBRATION;
    else if (tripCount >= 6) phase = ColdStartPhase.OFFLINE_SHAPLEY;
    else if (tripCount >= 2) phase = ColdStartPhase.HEURISTIC;
    return { userId, phase, tripCount };
  },

  updateUserTripCount(userId: string): { userId: string; tripCount: number } {
    const next = (tripCounts.get(userId) ?? 0) + 1;
    tripCounts.set(userId, next);
    return { userId, tripCount: next };
  },

  resetCalibrationCurves(): void {
    /* mock no-op */
  },

  updateColdStartConfig(config: Partial<ColdStartConfig>): ColdStartConfig {
    return {
      questionnaireThreshold: config.questionnaireThreshold ?? 0,
      heuristicThreshold: config.heuristicThreshold ?? 2,
      offlineShapleyThreshold: config.offlineShapleyThreshold ?? 6,
      realtimeCalibrationThreshold: config.realtimeCalibrationThreshold ?? 11,
    };
  },

  getColdStartConfig(): ColdStartConfig {
    return {
      questionnaireThreshold: 0,
      heuristicThreshold: 2,
      offlineShapleyThreshold: 6,
      realtimeCalibrationThreshold: 11,
    };
  },

  getCachedOutcome(tripId: string): TripOutcomeResponse | undefined {
    return outcomeCache.get(tripId);
  },
};
