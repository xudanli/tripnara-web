/**
 * 地点与路线模块类型定义
 */

// ==================== 基础类型 ====================

/**
 * 地点类别类型定义
 * 
 * 统一的地点类别枚举，用于：
 * - 地点搜索和推荐接口（places API）
 * - 行程项中的地点（trip API）
 * - 前端组件显示和筛选
 * 
 * 注意：
 * - TRANSPORT 和 TRANSIT_HUB 是同义词，后端可能返回任意一个
 * - 前端组件需要同时支持两者以确保兼容性
 */
export type PlaceCategory = 
  | 'ATTRACTION'    // 景点
  | 'RESTAURANT'    // 餐厅
  | 'CAFE'          // 咖啡厅
  | 'BAR'           // 酒吧
  | 'HOTEL'         // 酒店
  | 'MUSEUM'        // 博物馆
  | 'PARK'          // 公园
  | 'SHOPPING'      // 购物
  | 'TRANSPORT'     // 交通枢纽（与 TRANSIT_HUB 同义）
  | 'TRANSIT_HUB'   // 交通枢纽（与 TRANSPORT 同义）
  | 'OTHER';         // 其他

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
  countryCode?: string; // 国家代码过滤，如 "JP", "IS"
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
  countryCode?: string; // 国家代码过滤，如 "JP", "IS"
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
  countryCode?: string; // 国家代码过滤，如 "JP", "IS"
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
export type PacePreferenceEnum = 'RELAXED' | 'BALANCED' | 'INTENSE' | 'CHALLENGE';

/**
 * 每日计划中的POI信息
 * 
 * ⚠️ 重要：这是唯一支持的POI数据格式
 * - ✅ 使用 `pois` 数组存储POI信息
 * - ❌ 不再使用 `requiredNodes`（已废弃）
 */
export interface DayPlanPoi {
  id: number;                      // POI ID（必填）
  uuid?: string;                   // POI UUID（推荐）
  nameCN: string;                  // POI中文名称（必填）
  nameEN?: string;                 // POI英文名称（可选）
  category?: string;               // POI类别（可选）
  address?: string;                // POI地址（可选）
  rating?: number;                 // POI评分（0-5，可选）
  description?: string;            // POI描述（可选）
  required?: boolean;              // 是否为必游POI（默认false）
  order?: number;                  // POI顺序（可选，用于排序）
  durationMinutes?: number;        // 预计停留时间（分钟，可选）
  startTime?: string;              // 🆕 开始时间（可选，ISO 8601格式，如 "09:00:00" 或 "2024-05-01T09:00:00.000Z"）
  endTime?: string;                // 🆕 结束时间（可选，ISO 8601格式，如 "12:00:00" 或 "2024-05-01T12:00:00.000Z"）
  metadata?: Record<string, any>;  // 其他元数据（可选）
}

/**
 * 每日计划
 * 
 * 数据格式说明（2026-01-29更新）：
 * - ✅ 统一返回对象数组格式: [{day, theme, pois}, ...]
 * - ✅ 旧格式（嵌套数组 [[], [], []]）已由后端自动转换为新格式
 * - ✅ theme 字段可能为空（旧数据转换时），需要前端做条件渲染
 * - ✅ 前端无需做格式转换，直接使用返回的数据即可
 * 
 * ⚠️ 重要变更（2026-01-29）：
 * - ❌ `requiredNodes` 字段已废弃，后端已移除回退支持
 * - ✅ 全部使用 `pois` 格式（完整POI信息）
 * - ✅ `pois` 字段包含完整的POI信息，包括必游标记、顺序、停留时间等
 * 
 * @see https://docs/route-template-api-latest.md
 */
export interface DayPlan {
  day: number;                     // 第几天（从1开始，必填）
  theme?: string;                   // 主题/描述（可选，旧数据可能为空，需要条件渲染）
  maxIntensity?: IntensityLevel | 'LIGHT' | 'MODERATE' | 'INTENSE';  // 强度上限
  maxElevationM?: number;           // 最大海拔（米）
  /** @deprecated 已废弃，请使用 `pois` 字段。后端已移除回退支持。 */
  requiredNodes?: string[];        // POI ID数组（字符串格式，已废弃）
  optionalActivities?: string[];    // 可选活动类型
  pois?: DayPlanPoi[];             // 具体的POI列表（完整信息，必填）
  [key: string]: any;              // 其他扩展字段
}

export interface RouteTemplate {
  id: number;                      // 路线模板ID
  uuid: string;                    // 唯一标识符
  routeDirectionId: number;       // 关联的路线方向ID
  durationDays: number;            // 行程天数
  name?: string;                   // 模板名称（英文，兼容字段）
  nameCN?: string;                 // 模板中文名称
  nameEN?: string;                 // 模板英文名称
  dayPlans: DayPlan[];            // 每日计划数组
  defaultPacePreference?: PacePreferenceEnum;  // 默认节奏偏好
  metadata?: Record<string, any>;  // 元数据
  isActive: boolean;               // 是否激活
  createdAt: string;               // 创建时间（ISO 8601）
  updatedAt: string;                // 更新时间（ISO 8601）
  routeDirection?: {                // 关联的路线方向信息
    id: number;
    nameCN: string;
    nameEN?: string;
    countryCode: string;
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

/**
 * 从路线模板创建行程的请求参数
 * 
 * 注意：
 * - 后端会从模板中读取 dayPlans 数据
 * - 后端使用模板中的 `pois` 字段（完整POI信息）
 * - ⚠️ `requiredNodes` 已废弃，后端不再支持回退
 * - 前端不需要传递 dayPlans，后端会自动处理
 * 
 * @see POST /api/route-directions/templates/:id/create-trip
 */
export interface CreateTripFromTemplateRequest {
  // 必选：行程基本信息
  destination: string;        // 国家代码，如 "IS", "JP"
  startDate: string;         // ISO 8601, 如 "2024-06-01"
  endDate: string;           // ISO 8601, 如 "2024-06-07"
  totalBudget?: number;      // 可选
  name?: string;             // 🆕 行程名称（可选，如果是从模版创建，建议使用模版名称）
  
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

