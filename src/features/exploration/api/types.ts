/** Exploration Consumer API types — 对齐 EXPLORATION 前端集成指南 */

import type { ResolvedPoi } from '@/features/poi-resolution/types';

export type ExplorationEntryVariant =
  | 'SINGLE_RECOMMENDATION'
  | 'THREE_ROUTE_COMPARISON'
  | 'THEME_FIRST';

export type MaterializationStatus =
  | 'DRAFT'
  | 'MATERIALIZING'
  | 'MATERIALIZED'
  | 'COMPLETED'
  | 'ABANDONED';

export interface ExplorationDateRange {
  startDate: string;
  endDate: string;
}

export interface ExplorationTraveler {
  type: 'ADULT' | 'CHILD' | 'INFANT';
}

export interface ExplorationBudget {
  currency: string;
  min?: number;
  max?: number;
}

export interface ExplorationMobilityContext {
  vehicleType?: string;
}

export type ExplorationInsuranceCoverageTier = 'BASIC' | 'STANDARD' | 'FULL' | 'UNKNOWN';

export interface ExplorationInsuranceContext {
  coverageTier?: ExplorationInsuranceCoverageTier;
}

export interface ExplorationRentalContext {
  pickupLocation?: string;
  /** 首日取车 HH:mm */
  pickupTimeLocal?: string;
  afterHoursPickupConfirmed?: boolean;
}

export interface CreateExplorationScenarioRequest {
  researchProtocolId?: string;
  destinationCodes?: string[];
  dateRange?: ExplorationDateRange;
  travelers?: ExplorationTraveler[];
  budget?: ExplorationBudget;
  mobilityContext?: ExplorationMobilityContext;
  insuranceContext?: ExplorationInsuranceContext;
  rentalContext?: ExplorationRentalContext;
}

/** GET /exploration/conditions/catalog */
export interface ConditionsCatalogVehicleType {
  code: string;
  label: string;
}

export interface ConditionsCatalogInsuranceTier {
  code: ExplorationInsuranceCoverageTier;
  label: string;
}

export interface ConditionsCatalogResponse {
  vehicleTypes: ConditionsCatalogVehicleType[];
  insuranceTiers?: ConditionsCatalogInsuranceTier[];
  budgetPresets?: ExplorationBudget[];
}

/** GET /exploration/scenarios/:scenarioId */
export interface ExplorationScenarioDetail {
  scenarioId: string;
  sessionId: string;
  tripId?: string | null;
  researchProtocolId?: string | null;
  materializationStatus?: MaterializationStatus;
  assignedVariant?: ExplorationEntryVariant;
  lockedFields: string[];
  candidatesStatus?: ExplorationCandidatesStatus;
  scenario: {
    destinationCodes?: string[];
    dateRange?: ExplorationDateRange;
    travelers?: ExplorationTraveler[];
    budget?: ExplorationBudget;
    mobilityContext?: ExplorationMobilityContext;
    insuranceContext?: ExplorationInsuranceContext;
    rentalContext?: ExplorationRentalContext;
  };
}

export type ExplorationCandidatesLifecycleStatus =
  | 'EMPTY'
  | 'READY'
  | 'STALE'
  | 'SELECTED';

export type ExplorationGenerationMode = 'STATIC' | 'PERSONALIZED' | 'ENGINE';

export type RouteGenerationSource =
  | 'STATIC_CATALOG'
  | 'PERSONALIZED'
  | 'ENGINE_MAPBOX'
  | 'LLM';

export interface ExplorationCandidatesStatus {
  status: ExplorationCandidatesLifecycleStatus;
  activeCount: number;
  generationVersion: number | null;
  generationMode?: ExplorationGenerationMode;
  selectedRouteId?: string | null;
}

export interface ExplorationScenarioSummary {
  scenarioId: string;
  sessionId: string;
  tripId: string | null;
  materializationStatus: MaterializationStatus;
  assignedVariant: ExplorationEntryVariant;
  scenario?: Record<string, unknown>;
}

export interface PrincipleCatalogItem {
  principleId: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface SubmitPrincipleItem {
  principleId: string;
  rank: number;
}

export interface SubmitPrinciplesRequest {
  principles: SubmitPrincipleItem[];
}

export interface SavePrinciplesResponse {
  candidatesInvalidated?: number;
  candidatesStatus?: ExplorationCandidatesStatus;
}

/** POST /exploration/scenarios/:scenarioId/principles/summary — 原则选择预览总结 */
export interface PrinciplesSummaryRequest {
  principles: SubmitPrincipleItem[];
}

export interface PrinciplesSummaryView {
  /** 1–3 句自然语言总结；未选原则时为 null */
  summary: string | null;
  /** summary 为空时前端可展示的占位文案 */
  placeholder?: string | null;
  /** 可选：结构化要点 */
  highlights?: string[];
  /** LLM | RULES */
  source?: 'LLM' | 'RULES';
  generatedAt?: string;
}

/** @deprecated 使用 PrinciplesSummaryView */
export type PrinciplesSummaryResponse = PrinciplesSummaryView;

export interface PatchScenarioConditionsRequest {
  destinationCodes?: string[];
  dateRange?: ExplorationDateRange;
  travelers?: ExplorationTraveler[];
  budget?: ExplorationBudget;
  mobilityContext?: ExplorationMobilityContext;
  insuranceContext?: ExplorationInsuranceContext;
  rentalContext?: ExplorationRentalContext;
}

export interface PatchScenarioConditionsResponse {
  tripSynced?: boolean;
  candidatesInvalidated?: number;
  candidatesStatus?: ExplorationCandidatesStatus;
}

export interface GenerateCandidatesOptions {
  force?: boolean;
  idempotencyKey?: string;
}

export interface CandidatesBundle {
  candidates: RouteCandidateView[];
  generationVersion: number;
  generationMode?: ExplorationGenerationMode;
  dimensions?: RouteCompareDimension[];
}

export type EnsureFreshCandidatesAction = 'FETCHED' | 'GENERATED';

/** 路线地图 — 坐标均为 GeoJSON 顺序 [lng, lat] */
export type RouteLineCoordinates =
  | Array<[number, number]>
  | { type: 'LineString'; coordinates: Array<[number, number]> };

export type RouteMapLineStyle = 'solid' | 'dashed';

export interface RouteMapLayerView {
  id: string;
  lineStyle?: RouteMapLineStyle;
  label?: string;
  requires4wd?: boolean;
  /** 可选内联坐标；缺省时按 id 关联 mainLine / fRoadLine */
  coordinates?: RouteLineCoordinates;
}

export interface RouteMapGeometry {
  mainLine: RouteLineCoordinates;
  fRoadLine?: RouteLineCoordinates;
  layers?: RouteMapLayerView[];
}

export interface RouteMapPoint {
  lng: number;
  lat: number;
}

export interface RouteDayView {
  day: number;
  theme: string;
  route: string;
  driving: string;
  experience: string;
  stay: string;
  tip?: string;
  highlight?: boolean;
  mapPoint?: RouteMapPoint;
}

export interface RouteDetailView {
  summary: string;
  totalKm: number;
  avgDrivingHours: number;
  stayChanges: number;
  regions: string[];
  days: RouteDayView[];
  map?: RouteMapGeometry;
  highlights?: string[];
  preparations?: string[];
  resolvedPois?: ResolvedPoi[];
}

/** GET /exploration/scenarios/:scenarioId/routes/:routeId */
export interface RouteDetailResponse {
  routeId: string;
  strategyId?: string;
  title: string;
  tagline?: string;
  badge?: { label: string; tone?: 'recommended' | 'niche' };
  detail: RouteDetailView;
}

export interface RouteCandidatePreview {
  summary?: string;
  totalKm?: number;
  map?: RouteMapGeometry;
}

export interface RouteCandidateView {
  routeId: string;
  strategyId?: string;
  variantId?: string;
  title: string;
  tagline?: string;
  narrative?: string;
  generationSource?: RouteGenerationSource;
  badge?: { label: string; tone?: 'recommended' | 'niche' };
  audience?: string;
  gains?: Array<string | { id: string; label: string }>;
  sacrifices?: Array<string | { id: string; label: string }>;
  metrics?: Record<string, number | string> | {
    drivingHoursPerDay?: number;
    drivingLevel?: string;
    explorationLevel?: string;
    uncertainty?: string;
  };
  matchScore?: number;
  matchSummary?: string;
  preview?: RouteCandidatePreview;
  /** compare 接口可能在候选上附带各维度单元格 */
  compare?: Record<string, { level: string; note?: string } | unknown>;
  /** 后端已解析的途经 POI */
  resolvedPois?: ResolvedPoi[];
}

export interface RouteCompareDimension {
  key: string;
  label: string;
  higherIsBetter?: boolean;
  values: Record<string, { level: string; note?: string }>;
}

export interface RouteSelectionRequest {
  routeId: string;
  selectionReason?: string;
  prioritizedGainIds?: string[];
  acceptedSacrificeIds?: string[];
  concernText?: string;
}

export type CheckJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ExplorationCheckJobResult {
  verdictStatus?: string;
  totalIssueCount?: number;
  blockerIssueCount?: number;
  ontologyIssueCount?: number;
  gatewayOpenCount?: number;
  unresolvedPoiCount?: number;
  /** 如 ONTOLOGY_CONSTRAINT_BLOCK / POI_CONFIRMATION_REQUIRED */
  diagnosis?: string;
  checkDurationMs?: number;
}

export interface ExplorationCheckJob {
  jobId: string;
  status: CheckJobStatus;
  error?: string;
  scenarioId?: string;
  tripId?: string;
  result?: ExplorationCheckJobResult;
}

export interface ExplorationIssueSource {
  gatewayAssessmentBatchId: string;
  canonicalIssueId: string;
  tripId: string;
  tripVersion: number;
  evidenceVersion?: string;
}

import type { CprePoiIssueContext } from '@/features/poi-resolution/types';

export interface ConsumerIssueView {
  issueId: string;
  severity: 'BLOCK' | 'CONFLICT' | 'VERIFY' | 'OPTIMIZE';
  headline: string;
  explanation?: string;
  consequence?: string;
  affectedDay?: number;
  affectedSegmentLabel?: string;
  decisionRequired?: boolean;
  /** POI 确认 issue — 跳转 Compare 确认 sheet */
  cprePoi?: CprePoiIssueContext;
  source: ExplorationIssueSource;
}

export interface IssuesListResponse {
  displayedIssues: ConsumerIssueView[];
  totalIssueCount: number;
  gatewayIssueCount?: number;
  unresolvedPoiIssueCount?: number;
  ontologyIssueCount?: number;
  blockerIssueCount?: number;
  displayPolicy?: {
    maxIssues: number;
    preferredSeverity?: string;
  };
}

/** @deprecated 使用 IssuesListResponse */
export type IssuesView = IssuesListResponse;

/** @deprecated 使用 ConsumerIssueView */
export type ConsumerIssue = ConsumerIssueView;

export interface ConsumerRepairOption {
  optionId: string;
  title: string;
  summary?: string;
  preserves?: string[];
  sacrifices?: string[];
  canApply?: boolean;
  impact?: {
    costDelta?: number;
    drivingDeltaMinutes?: number;
    experienceDelta?: number;
    riskDelta?: number;
  };
}

export interface SubmitDecisionRequest {
  optionId: string;
  reason?: string;
  acknowledgement?: string[];
}

export interface ApplyDecisionResponse {
  apply?: Record<string, unknown>;
  revalidation?: {
    status: 'PASSED' | 'FAILED' | 'PENDING';
    message?: string;
  };
  originalProblem?: {
    problemId: string;
    resolved?: boolean;
    workflowStatus?: string;
    executionStatus?: string;
  };
  issues?: IssuesListResponse;
}

export type FeasibilityCheckResult =
  | { mode: 'sync'; job: ExplorationCheckJob; issues: IssuesListResponse }
  | { mode: 'async'; jobId: string; status: CheckJobStatus };

export interface ResearchEventPayload {
  sessionId: string;
  scenarioId: string;
  protocolId?: string;
  entryVariant?: ExplorationEntryVariant;
  tripId?: string | null;
  routeId?: string;
  timestamp: string;
  currentStep: string;
  appVersion?: string;
  [key: string]: unknown;
}

export interface ResearchEvent {
  eventName: string;
  payload: ResearchEventPayload;
}

export interface ContinuePackageCard {
  packageId: string;
  title: string;
  subtitle?: string;
  description?: string;
  highlights?: string[];
}

export interface ContinuePackagesResponse {
  presentationOrder: string[];
  packages: ContinuePackageCard[];
}

export interface ContinueFeedbackRequest {
  packageRankings: string[];
  valueScores?: Record<string, number>;
  trustScores?: Record<string, number>;
  acceptablePriceUsd?: { currency: string; min?: number; max?: number };
  leastPreferredPackageId?: string;
}

export type CommitmentType = 'NOTIFY_ME' | 'SELF_CHECK';

export interface SubmitCommitmentRequest {
  commitmentType: CommitmentType;
  email?: string;
}

export interface ResearchPaymentCatalogItem {
  skuId: string;
  title: string;
  description?: string;
  amountUsd?: number;
  refundable?: boolean;
  legalDisclaimer?: string;
}

export interface ResearchPaymentCatalogResponse {
  items: ResearchPaymentCatalogItem[];
  depositEnabled?: boolean;
  priceLockEnabled?: boolean;
}

export interface StartDepositResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  sandbox?: boolean;
}

export interface SubmitPriceLockRequest {
  lockedPriceUsd: number;
  email?: string;
}
