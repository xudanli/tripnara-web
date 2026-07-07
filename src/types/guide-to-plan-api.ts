/**
 * Guide-to-Plan 后端 API 类型（/api/guide-to-plan）
 */

import type { SourceConfidenceLevel } from '@/types/guide-import';

export type GuideToPlanSessionStatus =
  | 'collecting'
  | 'parsing'
  | 'understanding'
  | 'awaiting_context'
  | 'generating'
  | 'draft_ready'
  | 'accepted'
  | 'abandoned';

export type GuideImportSourceType = 'link' | 'text' | 'manual' | 'screenshot' | 'file';

export type ImportedGuideParseStatus = 'pending' | 'parsing' | 'parsed' | 'failed';

export type GuideParseJobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export type GuideParseStep =
  | 'content_analysis'
  | 'place_extraction'
  | 'route_identification'
  | 'fact_verification'
  | 'draft_generation';

export type PlanVariant = 'balanced' | 'faithful' | 'comfortable' | 'risk_min' | 'photography';

export type AcceptPlanMode = 'accept_all' | 'review_items' | 'keep_faithful';

export type PoiMatchStatus = 'unmatched' | 'matched' | 'ambiguous' | 'rejected';

/** BFF 恢复路由 — 优先于 status 推断 */
export type GuideToPlanResumeRoute =
  | 'import'
  | 'parse_progress'
  | 'understanding'
  | 'travel_context'
  | 'draft'
  | 'trip'
  | (string & {});

export type GuideTransportMode =
  | 'self_drive'
  | 'bus'
  | 'tour'
  | 'mixed'
  | 'unknown'
  | 'public_transit';

export type GuideVehicleType = '2wd' | '4x4' | 'suv' | 'campervan';

export interface GuideTravelers {
  adults?: number;
  children?: number;
  seniors?: number;
}

export interface GuideTravelContext {
  startDate?: string;
  endDate?: string;
  /** @deprecated 使用 travelers */
  travelerProfile?: string;
  travelers?: GuideTravelers;
  transportMode?: GuideTransportMode | string;
  vehicleType?: GuideVehicleType;
  /** 后端字段名 */
  preserveExperiences?: string[];
  /** @deprecated 使用 preserveExperiences */
  mustKeepExperiences?: string[];
  destination?: string;
  countryCode?: string;
}

export interface ImportedGuideView {
  id: string;
  title?: string | null;
  sourceType: GuideImportSourceType;
  sourceUrl?: string | null;
  sourcePlatform?: string | null;
  sourceMetadata?: {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    wordCount?: number;
  } | null;
  parseStatus: ImportedGuideParseStatus;
  sourceConfidence: number;
  credibilityLevel: SourceConfidenceLevel;
  importedAt: string;
  parsedAt?: string | null;
  parseError?: string | null;
}

export interface GuideToPlanSessionView {
  id: string;
  status: GuideToPlanSessionStatus;
  resumeRoute?: GuideToPlanResumeRoute | null;
  parseProgress?: GuideParseProgressView | null;
  requiresTravelContext?: boolean;
  draftCandidateCount?: number;
  countryCode?: string | null;
  destination?: string | null;
  travelContext?: GuideTravelContext | null;
  themeNarrative?: string | null;
  tripId?: string | null;
  importedGuides: ImportedGuideView[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportPreviewView {
  guideCount: number;
  estimatedPlaces: number;
  estimatedRestaurants: number;
  estimatedHotels: number;
  estimatedRisks: number;
}

export interface ImportGuideRequest {
  sourceType: GuideImportSourceType;
  title?: string;
  content?: string;
  sourceUrl?: string;
  manualInspirations?: string[];
  parseImmediately?: boolean;
}

export interface GuideToPlanSessionListParams {
  limit?: number;
  offset?: number;
  includeAbandoned?: boolean;
}

export interface GuideToPlanSessionListView {
  items: GuideToPlanSessionView[];
  total: number;
  limit: number;
  offset: number;
}

export interface GuideParseProgressView {
  jobId?: string;
  status: GuideParseJobStatus;
  currentStep?: GuideParseStep;
  currentStepLabel?: string;
  progress: number;
  estimatedSecondsRemaining?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  counts: {
    places: number;
    restaurants: number;
    hotels: number;
    tips: number;
    risks: number;
  };
  recognizedTags?: string[];
}

export interface UnderstandingPlaceGeoView {
  placeId: number;
  sourceText: string;
  matchedName: string;
  latitude: number;
  longitude: number;
  navigationPoint: { lat: number; lng: number };
  matchConfidence: number;
  geoResolutionStatus: string;
}

export interface UnderstandingPlaceView {
  id: string;
  candidateType: 'poi' | 'restaurant' | 'hotel' | 'activity' | 'route_theme';
  rawName: string;
  rawNameEn?: string | null;
  placeId?: number;
  credibilityLevel?: SourceConfidenceLevel;
  /** @deprecated 使用 matchStatus */
  poiMatchStatus?: PoiMatchStatus;
  matchStatus?: PoiMatchStatus;
  matchedPoiId?: number | null;
  suggestedDay?: number;
  routeOrder?: number;
  geo?: UnderstandingPlaceGeoView;
  geoResolutionStatus?: string;
}

export interface UnderstandingClaimView {
  id: string;
  statement: string;
  credibilityLevel?: SourceConfidenceLevel;
  claimType?: string;
}

export interface UnderstandingRiskView {
  id: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface GuideUnderstandingSummaryView {
  guideCount: number;
  placeCount: number;
  restaurantCount: number;
  hotelAreaCount: number;
  tipCount: number;
  riskCount: number;
  unmatchedPlaceCount: number;
  potentialIssues: string[];
  /** LLM 推断的行程天数 */
  suggestedTripDays?: number | null;
}

export type PendingConfirmationField =
  | 'startDate'
  | 'endDate'
  | 'travelerProfile'
  | 'travelers'
  | 'transportMode'
  | 'countryCode'
  | 'destination'
  | 'vehicleType'
  | (string & {});

export interface PendingConfirmation {
  field: PendingConfirmationField;
  label: string;
  /** @deprecated 使用 reason */
  message?: string;
  reason?: string;
  required?: boolean;
}

export interface GuideUnderstandingView {
  sessionId: string;
  status: GuideToPlanSessionStatus;
  summary: GuideUnderstandingSummaryView;
  themeNarrative?: string | null;
  places: UnderstandingPlaceView[];
  claims?: UnderstandingClaimView[];
  riskHints?: UnderstandingRiskView[];
  /** 待确认出行条件（日期、成员、交通、国家等） */
  pendingConfirmations?: PendingConfirmation[];
  /** 是否仍有必填出行条件未填 */
  requiresTravelContext?: boolean;
  /** 有攻略但未完成解析时为 true */
  parseRequired?: boolean;
  /** 已成功解析的攻略篇数 */
  parsedGuideCount?: number;
}

export interface ComparisonDiffRow {
  id?: string;
  category: string;
  originalGuide: string;
  adjustedPlan: string;
  reason?: string;
}

export type RouteAvailabilityLevel =
  | 'route_recommended'
  | 'route_operationally_available'
  | 'route_legally_allowed'
  | 'route_exists'
  | 'route_blocked';

export interface RouteAvailabilityView {
  routeExists: boolean;
  legallyAllowed: boolean;
  operationallyAvailable: boolean;
  recommended: boolean;
  level: RouteAvailabilityLevel;
  warnings: string[];
  blockedReasons: string[];
}

export interface ItineraryDraftAccommodation {
  candidateId?: string;
  placeId?: number | null;
  name: string;
  nameEn?: string | null;
  type: 'hotel' | 'area';
  source: 'guide' | 'adjusted' | 'inferred';
  checkInTime?: string;
  areaHint?: string;
  geo?: { lat: number; lng: number };
}

export interface GuideItineraryDraftItem {
  name: string;
  placeId?: number;
  candidateId?: string;
  type: string;
  startTime: string;
  endTime: string;
  source?: 'guide' | 'adjusted' | 'inferred';
  travelMinutesFromPrev?: number;
  travelDistanceKm?: number;
  travelKmFromPrev?: number;
  distanceKm?: number;
  visitDurationMinutes?: number;
  routeSource?: 'road_network' | 'heuristic';
  nameEn?: string | null;
  areaHint?: string;
  checkInTime?: string;
}

export interface GuideItineraryDraftDay {
  day: number;
  date?: string;
  theme?: string;
  route?: string;
  drivingMinutesEstimate?: number;
  routeAvailability?: RouteAvailabilityView;
  items?: GuideItineraryDraftItem[];
  /** @deprecated 旧 BFF 字段 */
  dayNumber?: number;
  drivingKm?: number;
  drivingDuration?: string;
  drivingTime?: string;
  /** 结构化住宿；旧 BFF 可能仍为 string */
  accommodation?: ItineraryDraftAccommodation | string | null;
  stay?: string;
  activities?: ItineraryDraftActivity[];
  hotels?: ItineraryDraftHotel[];
}

export interface GuideItineraryDraft {
  days: GuideItineraryDraftDay[];
  totalDays: number;
  variant: string;
  warnings: string[];
}

export interface ItineraryDraftActivity {
  name: string;
  startTime?: string;
  endTime?: string;
  type?: string;
}

export interface ItineraryDraftHotel {
  name: string;
  area?: string;
}

export interface ItineraryDraftDay {
  day?: number;
  dayNumber?: number;
  date?: string;
  theme?: string;
  route?: string;
  drivingKm?: number;
  drivingDuration?: string;
  drivingTime?: string;
  /** 结构化住宿；旧 BFF 可能仍为 string */
  accommodation?: ItineraryDraftAccommodation | string | null;
  stay?: string;
  activities?: ItineraryDraftActivity[];
  hotels?: ItineraryDraftHotel[];
}

export interface ItineraryDraftView {
  days?: ItineraryDraftDay[];
  routeStops?: string[];
  totalDays?: number;
  variant?: string;
  warnings?: string[];
}

/** 草案完整详情（generate / plan-candidates / plan-candidates/:id） */
export interface GuidePlanCandidateDetailView {
  id: string;
  variant: PlanVariant;
  label?: string;
  description?: string;
  recommended?: boolean;
  feasibilityScore?: number;
  pendingConfirmations?: PendingConfirmation[];
  comparisonDiff: ComparisonDiffRow[];
  warnings?: string[];
  disclaimer?: string;
  decisionEngineStatus?: 'unavailable' | 'applied' | 'skipped';
  itineraryDraft?: ItineraryDraftView | GuideItineraryDraft | null;
}

/** @deprecated 使用 GuidePlanCandidateDetailView */
export type PlanCandidateView = GuidePlanCandidateDetailView;

export interface GeneratePlanRequest {
  preferredVariant?: PlanVariant;
  variant?: PlanVariant;
  variants?: PlanVariant[];
}

export interface GeneratePlanResponse {
  candidate: GuidePlanCandidateDetailView;
  candidates?: GuidePlanCandidateDetailView[];
}

export interface AcceptPlanRequest {
  acceptanceMode?: AcceptPlanMode;
  planCandidateId?: string;
  /** @deprecated 使用 acceptanceMode */
  mode?: AcceptPlanMode;
  /** @deprecated 使用 planCandidateId */
  candidateId?: string;
  variant?: PlanVariant;
}

export interface AcceptPlanTripResponse {
  tripId: string;
  sessionId: string;
  reviewRequired?: false;
}

export interface PlanReviewItem {
  reviewKey: string;
  defaultSelected?: boolean;
  category?: string;
  label?: string;
  originalGuide?: string;
  adjustedPlan?: string;
  reason?: string;
}

export interface AcceptPlanReviewResponse {
  reviewRequired: true;
  items: PlanReviewItem[];
  sessionId?: string;
  planCandidateId?: string;
}

export type AcceptPlanResponse = AcceptPlanTripResponse | AcceptPlanReviewResponse;

export interface PlanReviewItemsResponse {
  items: PlanReviewItem[];
}

export interface ConfirmPlanRequest {
  planCandidateId: string;
  acceptedItemKeys: string[];
}

export interface ConfirmPlanResponse {
  tripId: string;
  sessionId: string;
}

export interface AbandonSessionResponse {
  sessionId: string;
  status: 'abandoned';
}

export interface CreateSessionRequest {
  countryCode?: string;
  destination?: string;
}

export interface ParseAsyncResponse {
  jobId: string;
}

export interface PlacesRematchRequest {
  countryCode?: string;
}

export interface PlacesRematchResponse {
  attempted: number;
  matched: number;
  stillUnmatched: number;
  summary?: GuideUnderstandingSummaryView;
}

export interface PatchPlaceCandidateRequest {
  placeId?: number;
  matchStatus?: PoiMatchStatus;
}

export interface PatchPlaceCandidateResponse {
  place: UnderstandingPlaceView;
  summary: GuideUnderstandingSummaryView;
}
