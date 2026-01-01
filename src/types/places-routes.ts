/**
 * 地点与路线模块类型定义
 */

// ==================== 基础类型 ====================

export type PlaceCategory = 'ATTRACTION' | 'RESTAURANT' | 'SHOPPING' | 'HOTEL' | 'TRANSIT_HUB';

export type RouteDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';

export type HotelRecommendationStrategy = 'CENTROID' | 'HUB' | 'RESORT';

export type TransportMode = 'WALKING' | 'TRANSIT' | 'TAXI' | 'DRIVING' | 'TRAIN' | 'FLIGHT';

export type SensitivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RouteProvider = 'google' | 'mapbox';

export type RouteProfile = 'walking' | 'driving';

export type AccessType = 'HIKING' | 'VEHICLE' | 'CABLE_CAR';

export type PacePreference = 'relaxed' | 'moderate' | 'intense';

export type RiskTolerance = 'low' | 'medium' | 'high';

export type RiskLevel = 'low' | 'medium' | 'high';

export type DensityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type HotelOptionId = 'CONVENIENT' | 'COMFORTABLE' | 'BUDGET';

// ==================== 地点相关类型 ====================

export interface Place {
  id: number;
  nameCN?: string;
  nameEN?: string;
  category: PlaceCategory;
  latitude?: number;
  longitude?: number;
  address?: string;
  rating?: number;
  metadata?: {
    openingHours?: Record<string, string>;
    ticketPrice?: string;
    description?: string;
    paymentMethods?: string[];
    [key: string]: any;
  };
  physicalMetadata?: {
    estimated_duration_min?: number;
    intensity_factor?: number;
    walking_distance_m?: number;
    [key: string]: any;
  };
  City?: {
    id: number;
    nameCN?: string;
    nameEN?: string;
    countryCode: string;
  };
  distance?: number; // 距离（米），用于附近地点和搜索
}

export interface PlaceWithDistance extends Place {
  distance: number;
}

// ==================== 接口 1: 获取地点详情 ====================

export interface GetPlaceResponse {
  success: true;
  data: Place;
  message: string;
}

// ==================== 接口 2: 批量获取地点详情 ====================

export interface BatchGetPlacesRequest {
  ids: number[];
}

export interface BatchGetPlacesResponse {
  success: true;
  data: Place[];
  message: string;
}

// ==================== 接口 3: 查找附近的地点 ====================

export interface GetNearbyPlacesParams {
  lat: number;
  lng: number;
  radius?: number;
  type?: PlaceCategory;
}

export interface GetNearbyPlacesResponse {
  success: true;
  data: PlaceWithDistance[];
  message: string;
}

// ==================== 接口 4: 查找附近的餐厅 ====================

export interface GetNearbyRestaurantsParams {
  lat: number;
  lng: number;
  radius?: number;
  payment?: string;
}

export interface GetNearbyRestaurantsResponse {
  success: true;
  data: PlaceWithDistance[];
  message: string;
}

// ==================== 接口 5: 关键词搜索地点 ====================

export interface SearchPlacesParams {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  type?: PlaceCategory;
  limit?: number;
}

export interface SearchPlacesResponse {
  success: true;
  data: PlaceWithDistance[];
  message: string;
}

// ==================== 接口 6: 语义地点搜索 ====================

export interface SemanticSearchParams {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  type?: PlaceCategory;
  limit?: number;
}

export interface SemanticSearchResult extends PlaceWithDistance {
  relevanceScore: number;
  reason?: string;
}

export interface SemanticSearchResponse {
  success: true;
  data: {
    results: SemanticSearchResult[];
    total: number;
  };
  message: string;
}

// ==================== 接口 7: 地点名称自动补全 ====================

export interface AutocompletePlacesParams {
  q: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface AutocompletePlacesResponse {
  success: true;
  data: PlaceWithDistance[];
  message: string;
}

// ==================== 接口 8: 推荐酒店 ====================

export interface HotelRecommendationRequest {
  tripId?: string;
  attractionIds?: number[];
  strategy?: HotelRecommendationStrategy;
  maxBudget?: number;
  minTier?: number;
  maxTier?: number;
  timeValuePerHour?: number;
  includeHiddenCost?: boolean;
}

// 接口3：根据城市和星级推荐酒店
export interface CityHotelRecommendationRequest {
  city: string;
  starRating: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface CityHotelRecommendation {
  id: string;
  name: string;
  brand: string | null;
  address: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
}

export interface CityHotelRecommendationResponse {
  success: true;
  data: CityHotelRecommendation[];
}

export interface HotelCostBreakdown {
  roomRate: number;
  transportCost: number;
  timeCost: number;
  hiddenCost: number;
  totalCost: number;
}

export interface HotelLocationScore {
  center_distance_km?: number;
  nearest_station_walk_min?: number;
  is_transport_hub?: boolean;
  avg_distance_to_attractions_km?: number;
  transport_convenience_score?: number;
}

export interface HotelRecommendation {
  hotelId: number;
  name: string;
  roomRate: number;
  tier: number;
  locationScore?: HotelLocationScore;
  totalCost?: number;
  costBreakdown?: HotelCostBreakdown;
  recommendationReason: string;
  distanceToCenter?: number;
}

// ==================== 接口 9: 推荐酒店选项 ====================

export interface HotelOption {
  id: HotelOptionId;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  hotels: HotelRecommendation[];
}

export interface HotelOptionsRequest {
  tripId?: string;
  attractionIds?: number[];
  maxBudget?: number;
  minTier?: number;
  maxTier?: number;
  timeValuePerHour?: number;
  includeHiddenCost?: boolean;
}

// 接口2直接返回对象，没有统一包装
export interface HotelOptionsResponse {
  options: HotelOption[];
  recommendation?: string;
  densityAnalysis?: {
    density: DensityLevel;
    avgPlacesPerDay: number;
    totalDays: number;
    totalAttractions: number;
  };
}

// ==================== 接口 10: 计算路线难度 ====================

export interface RouteDifficultyRequest {
  provider: RouteProvider;
  origin: string; // "lat,lng"
  destination: string; // "lat,lng"
  profile: RouteProfile;
  sampleM?: number;
  category?: string;
  accessType?: AccessType;
  elevationMeters?: number;
  includeGeoJson?: boolean;
}

export interface RouteDifficultyResponse {
  success: true;
  data: {
    difficulty: RouteDifficulty;
    distance: {
      km: number;
      miles: number;
    };
    elevation: {
      gain: number;
      loss: number;
      max: number;
      min: number;
    };
    slope: {
      average: number;
      max: number;
    };
    estimatedDuration: {
      hours: number;
      minutes: number;
    };
    route?: {
      geoJson?: any;
    };
  };
  message: string;
}

// ==================== 路线方向相关类型 ====================

export interface RouteDirection {
  id: number;
  uuid: string;
  countryCode: string;
  name: string;
  nameCN: string;
  nameEN?: string;
  description?: string;
  tags: string[];
  regions: string[];
  seasonality?: {
    bestMonths: number[];
    avoidMonths: number[];
    weather?: Record<string, string>;
  };
  constraints?: {
    minDays?: number;
    maxDays?: number;
    transportMode?: string[];
    soft?: {
      maxDailyAscentM?: number;
      maxElevationM?: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
  riskProfile?: {
    level: RiskLevel;
    factors: string[];
    altitudeSickness?: boolean;
    roadClosure?: boolean;
    [key: string]: any;
  };
  signaturePois?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  itinerarySkeleton?: {
    days: number;
    dailyPlan: Array<{
      day: number;
      regions: string[];
      highlights: string[];
    }>;
  };
  entryHubs?: string[];
  status?: 'draft' | 'active' | 'deprecated';
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteDirectionCard {
  id: number;
  name: string;
  nameCN: string;
  nameEN?: string;
  description?: string;
  tags: string[];
  score?: number;
  matchedSignals?: string[];
  seasonality?: {
    isBestMonth: boolean;
    month: number;
  };
}

// ==================== 接口 11: 查询路线方向 ====================

export interface QueryRouteDirectionsParams {
  countryCode?: string;
  tag?: string;
  tags?: string[];
  isActive?: boolean;
  month?: number;
}

export interface QueryRouteDirectionsResponse {
  success: true;
  data: RouteDirection[];
  message: string;
}

// ==================== 接口 12: 获取路线方向详情 ====================

export interface GetRouteDirectionResponse {
  success: true;
  data: RouteDirection;
  message: string;
}

// ==================== 接口 13: 获取路线方向卡片列表 ====================

export interface GetRouteDirectionCardsParams {
  countryCode: string;
  month?: number;
  preferences?: string[];
  pace?: PacePreference;
  riskTolerance?: RiskTolerance;
}

export interface GetRouteDirectionCardsResponse {
  success: true;
  data: RouteDirectionCard[];
  message: string;
}

// ==================== 接口 14: 获取路线方向交互列表 ====================

export interface RouteDirectionScoreBreakdown {
  tagMatch: {
    score: number;
    weight: number;
    matchedTags: string[];
    totalTags: number;
  };
  seasonality: {
    score: number;
    weight: number;
    isBestMonth: boolean;
    month: number;
  };
  pace: {
    score: number;
    weight: number;
    userPace: string;
    routePace: string;
    compatible: boolean;
  };
  risk: {
    score: number;
    weight: number;
    userTolerance: string;
    routeRisk: string;
    compatible: boolean;
  };
}

export interface RouteDirectionInteraction {
  direction: RouteDirectionCard;
  score: number;
  scoreBreakdown: RouteDirectionScoreBreakdown;
  explanation: string;
  whyNotOthers?: Array<{
    routeId: number;
    reason: string;
  }>;
}

export interface GetRouteDirectionInteractionsParams {
  countryCode: string;
  month?: number;
  preferences?: string[];
  pace?: PacePreference;
  riskTolerance?: RiskTolerance;
}

export interface GetRouteDirectionInteractionsResponse {
  success: true;
  data: {
    directions: RouteDirectionInteraction[];
    countryCode: string;
    month?: number;
    preferences: string[];
  };
  message: string;
}

// ==================== 接口 15: 根据国家获取路线方向 ====================

export interface GetRouteDirectionsByCountryParams {
  tags?: string[];
  month?: number;
  limit?: number;
}

export interface GetRouteDirectionsByCountryResponse {
  success: true;
  data: {
    active: RouteDirection[];
    deprecated?: RouteDirection[];
  };
  message: string;
}

// ==================== 交通规划相关类型 ====================

export interface TransportStep {
  mode: string;
  duration: number;
  distance: number;
  instruction: string;
}

export interface TransportOption {
  mode: TransportMode;
  name: string;
  duration: number;
  distance: number;
  cost: number;
  painIndex: number;
  recommendationReason: string;
  warnings: string[];
  details: {
    steps: TransportStep[];
  };
}

// ==================== 接口 15: 规划交通路线 ====================

export interface TransportPlanRequest {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  hasLuggage?: boolean;
  hasElderly?: boolean;
  isRaining?: boolean;
  budgetSensitivity?: SensitivityLevel;
  timeSensitivity?: SensitivityLevel;
  hasLimitedMobility?: boolean;
  currentCity?: string;
  targetCity?: string;
  isMovingDay?: boolean;
}

export interface TransportPlanResponse {
  success: true;
  data: {
    options: TransportOption[];
    recommended: {
      mode: string;
      reason: string;
    };
  };
  message: string;
}

// ==================== 路线模板相关类型 ====================

export type IntensityLevel = 'LIGHT' | 'MODERATE' | 'CHALLENGE' | 'EXTREME';
export type PacePreferenceEnum = 'RELAXED' | 'BALANCED' | 'CHALLENGE';

export interface DayPlan {
  day: number;
  theme?: string;
  maxIntensity?: IntensityLevel;
  maxElevationM?: number;
  requiredNodes?: string[]; // UUIDs of required nodes (e.g., lodges)
}

export interface RouteTemplate {
  id: number;
  uuid: string;
  routeDirectionId: number;
  durationDays: number;
  nameCN: string;
  nameEN?: string;
  dayPlans: DayPlan[];
  defaultPacePreference: PacePreferenceEnum;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  routeDirection?: {
    id: number;
    nameCN: string;
    nameEN?: string;
    countryCode?: string;
    tags?: string[];
  };
}

// ==================== 接口: 查询路线模板列表 ====================

export interface QueryRouteTemplatesParams {
  routeDirectionId?: number;
  durationDays?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface QueryRouteTemplatesResponse {
  success: true;
  data: RouteTemplate[];
  error: null;
}

// ==================== 接口: 获取路线模板详情 ====================

export interface GetRouteTemplateResponse {
  success: true;
  data: RouteTemplate;
  error: null;
}

// ==================== 接口: 更新路线模板 ====================

export interface UpdateRouteTemplateRequest {
  routeDirectionId?: number;
  durationDays?: number;
  name?: string;
  nameCN?: string;
  nameEN?: string;
  dayPlans?: DayPlan[];
  defaultPacePreference?: PacePreferenceEnum;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateRouteTemplateResponse {
  success: true;
  data: RouteTemplate;
  error: null;
}

// ==================== 接口: 使用模板创建行程 ====================

export interface CreateTripFromTemplateRequest {
  // 必选：行程基本信息
  destination: string;        // 国家代码，如 "IS", "JP"
  startDate: string;         // ISO 8601, 如 "2024-06-01"
  endDate: string;           // ISO 8601, 如 "2024-06-07"
  totalBudget?: number;      // 可选
  
  // 可选：用户偏好覆盖
  pacePreference?: 'RELAXED' | 'BALANCED' | 'CHALLENGE';  // 覆盖模板默认值
  intensity?: 'relaxed' | 'balanced' | 'intense';
  transport?: 'walk' | 'transit' | 'car';
  
  // 可选：约束条件
  travelers?: Array<{
    type: 'ADULT' | 'ELDERLY' | 'CHILD';
    mobilityTag: 'IRON_LEGS' | 'ACTIVE_SENIOR' | 'CITY_POTATO' | 'LIMITED';
  }>;
  
  constraints?: {
    withChildren?: boolean;
    withElderly?: boolean;
    earlyRiser?: boolean;
    dietaryRestrictions?: string[];
    avoidCategories?: string[];
  };
}

export interface GeneratedItineraryItem {
  placeId: number;
  type: 'ACTIVITY' | 'MEAL_ANCHOR' | 'MEAL_FLOATING' | 'REST' | 'TRANSIT';
  startTime: string;
  endTime: string;
  note?: string;
  reason?: string;  // 为什么选这个地点
}

export interface GeneratedDay {
  day: number;
  date: string;
  items: GeneratedItineraryItem[];
}

export interface CreateTripFromTemplateResponse {
  success: true;
  data: {
    trip: {
      id: string;
      destination: string;
      startDate: string;
      endDate: string;
      totalBudget: number;
      status: 'PLANNING';
      pacingConfig?: any;
      budgetConfig?: any;
    };
    
    // 生成的行程项（基于模板的 dayPlans + place 表）
    generatedItems: GeneratedDay[];
    
    // 生成统计
    stats: {
      totalDays: number;
      totalItems: number;
      placesMatched: number;  // 成功匹配到 place 表的数量
      placesMissing: number;   // 模板要求但未找到的地点数量
    };
    
    // 警告信息
    warnings?: string[];
  };
  error: null;
}

