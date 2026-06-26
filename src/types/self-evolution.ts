/** Round 3 · 自进化架构 — Trip Outcome / Memory / Calibration */

export enum DecisionNodeType {
  DESTINATION = 'destination',
  COMPANION = 'companion',
  BUDGET = 'budget',
  ITINERARY = 'itinerary',
  TIMING = 'timing',
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
  ACTIVITIES = 'activities',
  WEATHER_LUCK = 'weather_luck',
  EXTERNAL_FACTOR = 'external_factor',
}

export interface ShapleyAttribution {
  nodeId: string;
  nodeName: string;
  nodeType: DecisionNodeType;
  shapleyValue: number;
  rank: number;
  confidence: number;
}

// ─── Trip Outcome ───────────────────────────────────────────────

export interface TripOutcomeQuestionnaireResponses {
  overallSatisfaction: number;
  cognitiveEvaluation: number;
  positiveActivation: number;
  negativeActivation: number;
  willingnessToTravelAgain: number;
  groupDynamics: number;
  nps: number;
  recommendation: number;
}

export interface TripOutcomeRequest {
  tripId: string;
  userIds: string[];
  questionnaireResponses: TripOutcomeQuestionnaireResponses;
  plannedBudget: number;
  actualSpent: number;
  plannedActivities: number;
  completedActivities: {
    p0: number;
    p1: number;
  };
  hasAccidents: boolean;
  stressEventCount: number;
  preTripExpectation: number;
  pastExperienceReference?: number;
  companionExpectation?: number;
}

export interface TripOutcomeDimensions {
  overallSatisfaction: { score: number };
  companionSatisfaction: { score: number };
  budgetAccuracy: { score: number };
  completionQuality: { score: number };
  safety: { score: number };
  repurchase: { score: number };
}

export interface TripOutcomeResponse {
  tripId: string;
  dimensions: TripOutcomeDimensions;
  overallScore: number;
  expectationGap: {
    gap: number;
  };
  groupAggregation: {
    strategy: string;
    aggregatedScore: number;
    satisfiedMembers: string[];
    unsatisfiedMembers: string[];
  };
  weights: {
    overallSatisfaction: number;
    companionSatisfaction: number;
    budgetAccuracy: number;
    completionQuality: number;
    safety: number;
    repurchase: number;
  };
}

// ─── Memory ─────────────────────────────────────────────────────

export type LifeEventType =
  | 'marriage'
  | 'childbirth'
  | 'retirement'
  | 'relocation'
  | 'career_change';

export interface EpisodicMemory {
  id: string;
  userId: string;
  tripId: string;
  content: string;
  activationScore: number;
  seasonalityFactor: { season: string; activation: number };
  confidence: number;
  createdAt: string;
}

export interface SemanticMemory {
  id: string;
  userId: string;
  content: string;
  confidence: number;
  sourceMemoryIds: string[];
  metadata: {
    pattern: string;
    frequency: number;
  };
}

export interface EpisodicMemoryRequest {
  userId: string;
  tripId: string;
  events: unknown[];
  attribution: ShapleyAttribution[];
  outcome: TripOutcomeDimensions;
  timestamp: Date | string;
}

export interface SemanticMemoryReflectionRequest {
  userId: string;
  episodicMemories: EpisodicMemory[];
}

// ─── Calibration ────────────────────────────────────────────────

export enum CompatibilityDimension {
  BUDGET = 'budget',
  TRAVEL_PACE = 'travel_pace',
  INTERACTION_MODE = 'interaction_mode',
  SKILL_REQUIREMENT = 'skill_requirement',
  RISK_TOLERANCE = 'risk_tolerance',
  SOCIAL_STYLE = 'social_style',
  TEAM_BALANCE = 'team_balance',
  PAST_COLLABORATION = 'past_collaboration',
  REPUTATION_SCORE = 'reputation_score',
  MBTI_COMPATIBILITY = 'mbti_compatibility',
}

export enum ColdStartPhase {
  QUESTIONNAIRE = 'questionnaire',
  HEURISTIC = 'heuristic',
  OFFLINE_SHAPLEY = 'offline_shapley',
  REALTIME_CALIBRATION = 'realtime_calibration',
}

export interface CalibrationCurve {
  dimension: CompatibilityDimension | string;
  accuracy: number;
  sampleCount?: number;
  lastUpdated?: string;
}

export interface CompanionCalibrationRecord {
  id?: string;
  postId: string;
  applicationId: string;
  preTripPrediction: number;
  postTripSatisfaction: number;
  dimensionPredictions?: Partial<Record<CompatibilityDimension, number>>;
  dimensionSatisfactions?: Partial<Record<CompatibilityDimension, number>>;
  tripId?: string;
  createdAt?: string;
}

export interface CalibrationRecordRequest {
  postId: string;
  applicationId: string;
  preTripPrediction: number;
  postTripSatisfaction: number;
  dimensionPredictions?: Partial<Record<CompatibilityDimension, number>>;
  dimensionSatisfactions?: Partial<Record<CompatibilityDimension, number>>;
  tripId?: string;
}

export interface ColdStartStatus {
  userId: string;
  phase: ColdStartPhase | string;
  tripCount: number;
}

export interface ColdStartConfig {
  questionnaireThreshold: number;
  heuristicThreshold: number;
  offlineShapleyThreshold: number;
  realtimeCalibrationThreshold: number;
}
