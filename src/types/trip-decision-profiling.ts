export type DecisionStyleType =
  | 'RATIONAL_EXPLORER'
  | 'EXPERIENCE_SEEKER'
  | 'HARMONY_COORDINATOR'
  | 'SPONTANEOUS_ADVENTURER'
  | 'PRAGMATIC_PLANNER'
  | 'FLEXIBLE_OPTIMIZER';

export type FrictionDomain =
  | 'accommodation'
  | 'dining'
  | 'activities'
  | 'transportation'
  | 'pace'
  | 'budget'
  | 'planning_style'
  | 'group_decision';

export type FrictionLevel = 'green' | 'yellow' | 'red';

export type SplitMechanismMode = 'split_aa' | 'rotating_treat' | 'proportional' | 'hybrid';

export type CompatibilityBand = 'high' | 'needs_negotiation' | 'high_risk';

export type ConsumptionPace = 'planned' | 'spontaneous' | 'balanced';

export type QuizSection = 'travel_style' | 'money_dna';

export type DecisionProfilingStep = 'travel_style' | 'money_dna' | 'overview';

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}

export type DecisionProfilingProfileSource =
  | 'quiz'
  | 'quiz_edited'
  | 'reused'
  | 'reused_edited'
  | 'inferred';

export type ProfileReuseBlockedReason =
  | 'no_profile'
  | 'quiz_version_mismatch'
  | 'profile_stale'
  | 'inferred_only';

export interface ProfileReusePreview {
  travelStyleLabel: string;
  moneyDnaSummary: string;
  confidence: { travelStyle: number; moneyDna: number };
}

export interface ProfileReuseEligibility {
  eligible: boolean;
  quizVersion?: string;
  profileQuizVersion?: string;
  lastCompletedAt?: string;
  lastCompletedTripLabel?: string;
  preview?: ProfileReusePreview;
  blockedReason: ProfileReuseBlockedReason | null;
}

export interface OnboardingStatus {
  tripId: string;
  userId: string;
  travelStyleCompleted: boolean;
  moneyDnaCompleted: boolean;
  quizCompleted: boolean;
  teamCompletionRate: number;
  reuse?: ProfileReuseEligibility;
}

export interface QuizOption {
  id: string;
  label: string;
  scores?: Record<string, number>;
}

export interface QuizQuestion {
  id: string;
  section: QuizSection;
  prompt: string;
  options: QuizOption[];
}

export interface QuizPayload {
  travelStyleQuestions: QuizQuestion[];
  moneyDnaQuestions: QuizQuestion[];
  estimatedMinutes: { min: number; max: number };
  quizVersion?: string;
}

export interface ReuseProfileRequest {
  sections: ['travel_style', 'money_dna'];
  userNote?: string;
}

export interface QuizPrefillData {
  travelStyleAnswers: QuizAnswer[];
  moneyDnaAnswers: QuizAnswer[];
  userNote?: string;
}

export interface QuizPrefillResponse {
  prefill: QuizPrefillData;
  source: 'user_profile' | string;
}

export interface SubmitTravelStyleRequest {
  answers: QuizAnswer[];
  userNote?: string;
}

export interface TravelStyleCard {
  userId: string;
  styleType: DecisionStyleType;
  styleLabel: string;
  coreDrivers: string[];
  teamRole: string;
  compatibilityHints: string[];
  userNote?: string;
  confidence: number;
  completedAt: string;
  source: DecisionProfilingProfileSource;
}

export interface TeamTravelStyleItem {
  userId: string;
  displayName: string;
  styleLabel: string;
  compatibilityHints: string[];
}

export interface MoneyDnaVector {
  experienceTendency: number;
  qualityTendency: number;
  timeValueTendency: number;
  socialScarcityTendency: number;
}

export interface MoneyDnaCard {
  userId: string;
  vector: MoneyDnaVector;
  budgetRangeMin?: number;
  budgetRangeMax?: number;
  consumptionPace: ConsumptionPace;
  confidence: number;
  completedAt: string;
  source?: DecisionProfilingProfileSource;
}

export interface TeamMoneyDnaItem {
  userId: string;
  displayName: string;
  styleSimilarityPct: number;
}

export interface FrictionMatrixCell {
  domain: FrictionDomain;
  level: FrictionLevel;
  score: number;
  reason: string;
}

export interface FrictionMatrixPair {
  memberAId: string;
  memberBId: string;
  memberAName: string;
  memberBName: string;
  overallLevel: FrictionLevel;
  cells: FrictionMatrixCell[];
}

export interface HighRiskAlert {
  id: string;
  domain: FrictionDomain;
  domainLabel: string;
  level: FrictionLevel;
  memberAName: string;
  memberBName: string;
  summary: string;
  recommendedStrategy: string;
}

export interface CompatibilityScore {
  budgetOverlapPct: number;
  styleSimilarityPct: number;
  paceSyncPct: number;
  overallScore: number;
  band: CompatibilityBand;
  bandLabel: string;
}

export interface FrictionRadarData {
  tripId: string;
  completionRate: number;
  completedCount: number;
  memberCount: number;
  frictionMatrix: FrictionMatrixPair[];
  highRiskAlerts: HighRiskAlert[];
  compatibility: CompatibilityScore;
  computedAt: string;
}

export interface HybridBreakdown {
  transportation?: string;
  accommodation?: string;
  dining?: string;
  activities?: string;
}

export interface SplitConsensusOption {
  mode: SplitMechanismMode;
  label: string;
  description: string;
  fitScore: number;
  rationale: string;
  hybridBreakdown?: HybridBreakdown;
}

export interface SplitSimulationMember {
  userId: string;
  displayName: string;
  estimatedSpend: number;
}

export interface SplitSimulationMode {
  members: SplitSimulationMember[];
  note: string;
}

export interface SplitSimulation {
  totalEstimate: number;
  currency: string;
  byMode: Partial<Record<SplitMechanismMode, SplitSimulationMode>>;
}

export interface SplitConfirmation {
  userId: string;
  displayName: string;
  confirmedAt: string | null;
}

export interface SplitConsensusData {
  tripId: string;
  recommendedMode: SplitMechanismMode;
  options: SplitConsensusOption[];
  simulation: SplitSimulation | null;
  selectedMode: SplitMechanismMode | null;
  confirmations: SplitConfirmation[];
  lockedAt: string | null;
  lockedMode: SplitMechanismMode | null;
  allConfirmed: boolean;
}

export interface SimulateSplitRequest {
  totalEstimate: number;
  currency?: string;
}

export interface SelectSplitModeRequest {
  mode: SplitMechanismMode;
}

/** route_and_run payload.decision_profiling */
export interface DecisionProfilingClientNavigation {
  route: 'decision_profiling_quiz' | string;
  tripId: string;
  step: DecisionProfilingStep;
  /** P1：沿用档案 vs 打开调查 */
  action?: 'reuse_profile' | 'open_quiz';
}

export interface DecisionProfilingPayload {
  triggered: boolean;
  tripId?: string;
  userId?: string;
  onboarding?: Pick<
    OnboardingStatus,
    | 'travelStyleCompleted'
    | 'moneyDnaCompleted'
    | 'quizCompleted'
    | 'teamCompletionRate'
    | 'reuse'
  >;
  memberCount?: number;
  nextStep?: DecisionProfilingStep;
  promptKind?: 'first_prompt' | 'reminder' | string;
  agentIntroZh?: string;
  clientNavigation?: DecisionProfilingClientNavigation;
  skippedReason?: string;
}
