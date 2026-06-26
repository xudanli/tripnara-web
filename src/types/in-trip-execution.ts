export type HandoffMissingCode =
  | 'plan_confirmed'
  | 'budget_intent'
  | 'budget_structure'
  | 'wallet_rule'
  | 'split_mechanism_locked'
  | 'itinerary_days'
  | 'trip_members'
  | 'trip_not_found';

export type QuickAction = 'record_expense' | 'mood_check' | 'ask_ai';

export type ThermometerLevel = 'green' | 'yellow' | 'orange' | 'red';

export type VulnerabilitySeverity = 'green' | 'yellow' | 'red';

/** 后端行中状态；前端 UI 归一化为 IN_PROGRESS */
export type InTripTravelStatus = 'TRAVELING';

export interface HandoffVerifyResult {
  tripId: string;
  ready: boolean;
  missing: HandoffMissingCode[];
  warnings: string[];
}

export interface InTripAnchorSnapshotPublic {
  tripId: string;
  materializedAt: string;
  schemaVersion: number;
  metadata: {
    destination: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    timezone: string;
  };
  team: {
    memberCount: number;
    profilingCompletionRate: number;
    compatibilityScore: number;
    highRiskAlertCount: number;
  };
  budget: {
    total: number;
    currency: string;
    splitMechanismLocked: boolean;
  };
  itinerary: {
    dayCount: number;
    itemCount: number;
    nonRefundableCount: number;
  };
}

export interface HandoffMaterializeResult {
  tripId: string;
  materialized: boolean;
  alreadyExists: boolean;
  snapshot?: InTripAnchorSnapshotPublic;
  verify: HandoffVerifyResult;
}

export interface AnchorItineraryItem {
  id: string;
  type: string;
  title: string;
  startTime?: string;
  refundable: boolean;
  estimatedCost?: number;
  category: string;
}

export interface TodayDashboardSnapshot {
  dayNumber: number;
  date: string;
  weather: {
    summary: string;
    tempMin: number | null;
    tempMax: number | null;
    icon: string;
    source: 'stub' | 'environment_radar';
  };
  vulnerability: {
    severity: VulnerabilitySeverity;
    stabilityScore: number;
    source: 'stub' | 'environment_radar';
  };
  timeline: {
    planned: AnchorItineraryItem[];
    actual: AnchorItineraryItem[];
    deviations: unknown[];
  };
  quickActions: QuickAction[];
  teamThermometer: {
    level: ThermometerLevel;
    visible: boolean;
    source: 'stub' | 'group_pulse';
  };
  pendingCards: {
    environmentAlerts: number;
    interventions: number;
    experiencePulses: number;
    rebalanceSuggestions: number;
  };
  budgetSnapshot: {
    overallUsagePercent: number | null;
    topBucket: { category: string; usagePercent: number } | null;
    source: 'budget_os' | 'unavailable';
  };
  anchorMaterialized: boolean;
  /** 今日就绪（计划可执行性：证据、密度、路段风险） */
  todayReadiness?: InTripTodayReadiness;
}

export type InTripTodayReadinessStatus = 'pass' | 'warn' | 'block';

export interface InTripTodayReadinessFinding {
  id: string;
  type: 'must' | 'should' | 'blocker' | string;
  category: string;
  message: string;
  actionRequired?: string | null;
  severity?: string;
}

export interface InTripTodayReadinessEngine {
  source: 'readiness_engine';
  dayNumber: number;
  date?: string;
  status: InTripTodayReadinessStatus;
  score: number;
  summary?: { blockers: number; must: number; should: number };
  dimensions?: {
    evidenceCoverage?: number;
    scheduleFeasibility?: number;
    transportCertainty?: number;
    safetyRisk?: number;
  };
  topFindings?: InTripTodayReadinessFinding[];
  readinessPhase?: TripReadinessPhaseLiteral;
  calculatedAt?: string;
  scopeNote?: { zh?: string; en?: string };
}

export interface InTripTodayReadinessUnavailable {
  source: 'unavailable';
  reason?: string;
}

export type InTripTodayReadiness = InTripTodayReadinessEngine | InTripTodayReadinessUnavailable;

export type TripReadinessPhaseLiteral = 'planning' | 'pre_departure' | 'in_trip' | 'past';

/** GET /trips/:id/in-trip/readiness/today 详情 */
export interface InTripTodayReadinessDetail {
  dayNumber: number;
  date: string;
  status: InTripTodayReadinessStatus;
  score: number;
  summary: { blockers: number; must: number; should: number };
  dimensions?: InTripTodayReadinessEngine['dimensions'];
  topFindings: InTripTodayReadinessFinding[];
  readinessPhase: TripReadinessPhaseLiteral;
  calculatedAt: string;
  scopeNote?: { zh?: string; en?: string };
}

export type EnvironmentEventType = 'weather' | 'traffic' | 'attraction' | 'other';
export type EnvironmentEventStatus = 'open' | 'voting' | 'resolved' | 'dismissed';

export interface EnvironmentEventSummary {
  id: string;
  tripId: string;
  type: EnvironmentEventType;
  severity: VulnerabilitySeverity;
  description: string;
  status: EnvironmentEventStatus;
  detectedAt: string;
  affectedItemCount: number;
  alternativePlanCount: number;
  silentVoteId?: string;
}

export interface EnvironmentAlternativePlan {
  planId: string;
  name: string;
  description: string;
  timeAdjustment: string;
  costDifference: number;
  experienceEquivalence: number;
  bookingRequired: boolean;
  silentVoteOptionId?: string;
}

export interface EnvironmentEventResolution {
  selectedPlanId?: string;
  voteResults?: Record<string, { ballots: number; weightedScore: number }>;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface EnvironmentEventDetail extends EnvironmentEventSummary {
  affectedItems: Array<{
    itemType: string;
    itemId: string;
    itemName: string;
    originalTime?: string;
    refundable: boolean;
  }>;
  alternativePlans: EnvironmentAlternativePlan[];
  cascadeImpact: Array<{
    affectedDay: number;
    affectedItem: string;
    impactType: string;
    impactDescription: string;
  }>;
  resolution?: EnvironmentEventResolution;
  resolvedAt?: string;
}

export interface EnvironmentEventVoteRequest {
  planId: string;
  preferenceStrength: number;
  comment?: string;
}

export interface EnvironmentEventVoteResult {
  eventId: string;
  ballot: {
    optionId: string;
    intensity: number;
    submittedAt: string;
    updatedAt: string;
  };
  comment: string | null;
}

export interface DayVulnerabilityScore {
  tripId: string;
  dayNumber: number;
  date: string;
  stabilityScore: number;
  severity: VulnerabilitySeverity;
  factors: Array<{ code: string; message: string; weight: number }>;
  computedAt: string;
}

export interface EnvironmentScanResult {
  tripId: string;
  createdEvents: number;
}
