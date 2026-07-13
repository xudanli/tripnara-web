/** TEP 自驾可执行性 — GET /trips/:tripId/executability */

export type ExecutabilityStatus =
  | 'EXECUTABLE'
  | 'EXECUTABLE_WITH_CAUTION'
  | 'REQUIRES_CONFIRMATION'
  | 'REQUIRES_REPAIR'
  | 'NOT_EXECUTABLE'
  | 'UNKNOWN';

export type RuleOutcome =
  | 'PASS'
  | 'CAUTION'
  | 'NEED_CONFIRM'
  | 'SUGGEST_REPAIR'
  | 'REJECT'
  | 'UNKNOWN';

export type RuleSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DriveLoadTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export type ExecutabilityStripLevel = 'success' | 'warning' | 'danger' | 'neutral';

export interface ExecutabilityAssessmentUi {
  status: ExecutabilityStatus;
  statusLabel: string;
  stripLevel: ExecutabilityStripLevel;
  canCommit: boolean;
  primaryCta: {
    label: string;
    deepLink: string;
  };
}

export interface ValidationFinding {
  findingId: string;
  ruleId: string;
  outcome: RuleOutcome;
  severity: RuleSeverity;
  message: string;
  affectedRefs: string[];
}

export interface PlanningRuleResult {
  ruleId: string;
  outcome: RuleOutcome;
  severity: RuleSeverity;
  affectedRefs: string[];
  explanation: string;
  degraded?: boolean;
  degradationReason?: string;
}

export interface ExecutabilityAssessment {
  schemaId: string;
  status: ExecutabilityStatus;
  findings: ValidationFinding[];
  ruleResults: PlanningRuleResult[];
  evaluatedAt: string;
  planVersionRef?: string;
}

export interface DailyDrivePlan {
  date: string;
  dayIndex: number;
  origin: { ref: string; label: string };
  destination: { ref: string; label: string };
  legs: Array<{
    legId: string;
    baseNavigationMinutes: number;
    adjustedMinutes?: number;
    roadRefs: string[];
  }>;
  accommodation?: {
    ref: string;
    latestArrival?: string;
    checkInFrom?: string;
  };
  activities: Array<{
    ref: string;
    importance: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
    flexibility: 'FIXED' | 'MOVABLE' | 'REPLACEABLE' | 'REMOVABLE';
    weatherSensitive: boolean;
    reservationRequired: boolean;
    fixedStartAt?: string;
  }>;
}

export interface LocalRepairPreview {
  optionId: string;
  action: 'REMOVE' | 'REPLACE' | 'SHIFT' | 'REROUTE';
  targetRefs: string[];
  minutesReleased: number;
  loadTierBefore: DriveLoadTier;
  loadTierAfter: DriveLoadTier;
  statusBefore: ExecutabilityStatus;
  statusAfter: ExecutabilityStatus;
  description: string;
}

export interface SelfDriveProfile {
  vehicle: {
    vehicleType: '2WD' | '4WD' | 'AWD' | 'CAMPERVAN' | 'OTHER';
    vehicleSource: string;
  };
  drivingPolicy: {
    nightDrivingAllowed: boolean;
    nightDrivingPreference: 'AVOID' | 'ALLOW_WITH_CAUTION' | 'ALLOW';
    maxDailyDriveMinutes?: number;
  };
  drivers?: Array<{
    driverId: string;
    experienceLevel: 'NOVICE_ABROAD' | 'INTERMEDIATE' | 'EXPERIENCED';
  }>;
}

export interface TripExecutabilityView {
  tripId: string;
  assessment: ExecutabilityAssessment;
  ui: ExecutabilityAssessmentUi;
  profile: SelfDriveProfile;
  dailyDrivePlans: DailyDrivePlan[];
  repairPreviews: LocalRepairPreview[];
  isStale: boolean;
  planVersionId?: string;
  hooksPersisted: boolean;
  decisionHooks?: unknown[];
  recoveryGraph?: unknown;
  tepRuleResults?: PlanningRuleResult[];
  worldStateEvidence?: unknown;
  evidenceBinding?: string;
}
