/** 规划工作台 · 探索景点 */

export type AttractionExploreViewTab = 'recommended' | 'map' | 'along_route';

export type AttractionExplorePriority = 'must_go' | 'very_interested' | 'alternative';

export type AttractionExploreDetourMethod =
  | 'iceland_heuristic'
  | 'generic_driving'
  | 'live_route_api';

export type AttractionExploreExploreIntentSource = 'rules' | 'rules+llm';

export interface AttractionExploreFilterOption {
  id: string;
  label: string;
}

export interface AttractionExploreTripContext {
  departureLabel: string;
  transportLabel: string;
  paceLabel: string;
  weatherLabel: string;
}

export interface AttractionExploreMemberPreferences {
  memberCount: number;
  memberInitials: string[];
  summary: string;
}

export interface AttractionExploreMetadata {
  stayMinutes?: number;
  detourMinutes?: number;
  detourMethod?: AttractionExploreDetourMethod;
  physicalLevel?: 'low' | 'medium' | 'high';
  bookingRequired?: boolean;
  distanceFromRouteKm?: number;
}

export interface AttractionExploreItem {
  id: string;
  placeId?: number | string;
  name: string;
  nameEN?: string;
  categoryLabel: string;
  regionLabel?: string;
  description: string;
  imageUrl?: string;
  badge?: string;
  metadata: AttractionExploreMetadata;
}

export interface AttractionExploreSection {
  id: string;
  title: string;
  subtitle?: string;
  /** BFF groupId，如 experience_gap、along_route */
  groupKind?: string;
  items: AttractionExploreItem[];
}

export interface AttractionExploreContextResponse {
  themes: AttractionExploreFilterOption[];
  suitability: AttractionExploreFilterOption[];
  tripContext: AttractionExploreTripContext;
  memberPreferences: AttractionExploreMemberPreferences;
  selectedThemeIds: string[];
  selectedSuitabilityIds: string[];
  selectedViewTab?: AttractionExploreViewTab;
}

export interface AttractionExploreUpdateContextRequest {
  selectedThemeIds?: string[];
  selectedSuitabilityIds?: string[];
  viewTab?: AttractionExploreViewTab;
  selectedFilters?: {
    themeIds?: string[];
    suitabilityIds?: string[];
    viewTab?: AttractionExploreViewTab;
  };
}

export interface AttractionExploreMapInsertHint {
  suggestedDayIndex: number;
  detourMinutes?: number;
  startTime?: string;
  endTime?: string;
  detourMethod?: AttractionExploreDetourMethod;
}

/** P2 · 当日末段 → 当晚住宿路线 */
export interface AttractionExploreMapLodgingLegEndpoint {
  kind?: string;
  placeId?: number | string;
  label?: string;
}

export interface AttractionExploreMapLodgingLeg {
  id?: string;
  dayIndex: number;
  nightIndex?: number;
  fromPointId?: string;
  toPointId?: string;
  from?: AttractionExploreMapLodgingLegEndpoint;
  to?: AttractionExploreMapLodgingLegEndpoint;
  polyline?: Array<{ lat: number; lng: number }>;
  label?: string;
  driveMinutes?: number;
  distanceKm?: number;
  legKind?: 'approach' | 'relocation';
}

export interface AttractionExploreMapPoint {
  id: string;
  placeId?: number | string;
  name: string;
  lat: number;
  lng: number;
  kind?: 'candidate' | 'recommended' | 'route' | 'lodging' | 'lodging_suggestion';
  highlighted?: boolean;
  dayIndex?: number;
  lodgingRole?: 'overnight' | 'suggestion';
  /** GET map?includeInsertHints=true 时候选 POI 附带 */
  insertHint?: AttractionExploreMapInsertHint;
}

export interface AttractionExploreMapResponse {
  points: AttractionExploreMapPoint[];
  routePolyline?: Array<{ lat: number; lng: number }>;
  lodgingLegs?: AttractionExploreMapLodgingLeg[];
}

export interface AttractionExploreCandidatesResponse {
  candidates: AttractionExploreCandidate[];
  summary: AttractionExploreSummary;
  /** POST 加入候选时返回的预检结果 */
  precheck?: AttractionExploreCandidatePrecheck;
  /** copilot 模式下 must_go / very_interested 可附带下一步协同动作 */
  copilotNextAction?: AttractionExploreCopilotNextAction;
}

export interface AttractionExploreCandidatePrecheckWarning {
  code: string;
  message: string;
  severity?: 'warn' | 'error' | 'info';
}

export interface AttractionExploreCandidatePrecheck {
  feasible: boolean;
  warnings: AttractionExploreCandidatePrecheckWarning[];
}

export interface AttractionExploreCopilotNextAction {
  action: import('@/types/arrange-itinerary').CopilotActionType;
  candidateId?: string;
  suggestionId?: string;
  endpoint?: string;
}

export interface AttractionExploreCandidate {
  id: string;
  placeId?: number | string;
  attractionId?: string;
  name: string;
  imageUrl?: string;
  priority: AttractionExplorePriority;
  sortOrder: number;
  source?: 'guide_accept' | 'route_seed' | 'manual' | string;
}

export interface AttractionExploreSummary {
  attractionCount: number;
  estimatedDays: number;
  routeSpanKm: number;
}

export interface AttractionExploreCompiledIntent {
  query?: string;
  themes?: AttractionExploreFilterOption[];
  suitableFor?: AttractionExploreFilterOption[];
  maxDetourMinutes?: number;
  weatherMode?: string;
  routeContext?: string;
  /** rules 优先；条件不足时 rules+llm */
  source?: AttractionExploreExploreIntentSource;
}

export interface AttractionExploreExploreIntentRequest {
  tripId: string;
  query: string;
  useLlm?: boolean;
}

export interface AttractionExploreExploreIntentResponse extends AttractionExploreCompiledIntent {
  tripId?: string;
}

export interface AttractionExploreRecommendationsResponse {
  sections: AttractionExploreSection[];
  updatedAt?: string;
  /** POST /search 返回的结构化意图（已合并进检索与评分） */
  compiledIntent?: AttractionExploreCompiledIntent;
}

export interface AttractionExploreSearchRequest {
  tripId: string;
  query: string;
  themeIds?: string[];
  suitabilityIds?: string[];
  viewTab?: AttractionExploreViewTab;
  limit?: number;
  useLlmIntent?: boolean;
  useLiveRoutes?: boolean;
}

export interface AttractionExploreRouteOptions {
  useLiveRoutes?: boolean;
}

export interface AttractionExploreAddCandidateRequest {
  tripId: string;
  placeId?: number | string;
  attractionId?: string;
  priority?: AttractionExplorePriority;
  useLiveRoutes?: boolean;
}

export interface AttractionExploreRemoveCandidateRequest {
  tripId: string;
  candidateId: string;
}

export interface AttractionExploreReorderCandidatesRequest {
  tripId: string;
  candidates: Array<{
    id: string;
    priority: AttractionExplorePriority;
    sortOrder: number;
  }>;
}

export interface AttractionExploreAutoArrangeRequest {
  tripId: string;
  candidateIds?: string[];
}

export interface AttractionExploreAutoArrangeResponse {
  taskId?: string;
  message?: string;
}

export interface AttractionExploreAiConsultRequest {
  tripId: string;
  question?: string;
  candidateIds?: string[];
}

export interface AttractionExploreAiConsultResponse {
  answer: string;
  suggestedActions?: Array<{ label: string; action: string }>;
}

export interface AttractionExploreMapPlaceSuggestion {
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  detourMinutes?: number;
  label?: string;
  insertMode?: 'append' | 'before' | 'after';
  anchorItemId?: string;
}

export interface AttractionExploreMapPlaceProposalRequest {
  tripId: string;
  placeId: number | string;
  dayIndex: number;
  candidateId?: string;
  suggestionIndex?: number;
  useLiveRoutes?: boolean;
}

export interface AttractionExploreMapPlaceProposalResponse {
  suggestions: AttractionExploreMapPlaceSuggestion[];
  mode: 'proposal';
  tripId: string;
  proposal: import('@/types/arrange-itinerary').PlanProposal;
  orchestrationState: import('@/types/arrange-itinerary').ArrangeOrchestrationState;
  answer?: string;
}
