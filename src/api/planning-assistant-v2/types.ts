/**
 * Planning Assistant V2 API 类型定义
 * 
 * 根据 Planning Assistant V2 API 完整接口文档定义
 */

// ==================== 会话管理类型 ====================

export interface CreateSessionRequest {
  userId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface SessionState {
  sessionId: string;
  userId?: string;
  phase: string;
  preferences?: {
    destination?: string;
    budget?: number;
    duration?: number;
    travelers?: {
      adults: number;
      children: number;
    };
    pace?: string;
    interests?: string[];
  };
  recommendations?: Recommendation[];
  planCandidates?: Plan[];
  selectedPlanId?: string;
  confirmedTripId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 对话类型 ====================

export interface ChatRequest {
  sessionId: string;
  message: string;
  userId?: string;
  language?: 'en' | 'zh';
}

// 路由目标类型（支持所有 MCP 服务）
export type RoutingTarget = 
  | 'recommendations' 
  | 'generate' 
  | 'compare' 
  | 'hotel'
  | 'airbnb'
  | 'accommodation'
  | 'restaurant'
  | 'weather'
  | 'search'
  | 'flight'
  | 'rail'
  | 'translate'
  | 'currency'
  | 'image'
  | 'chat';

export interface ChatResponse {
  message: string; // 英文回复（始终提供）
  messageCN?: string; // 中文回复（始终提供）
  reply: string; // 主要回复消息（根据用户输入语言自动选择）
  replyCN?: string; // 中文回复（始终提供）
  sessionId: string;
  phase: string;
  routing?: {
    target: RoutingTarget;
    reason: string;
    reasonCN?: string; // 路由原因（中文）
    params?: Record<string, any>;
  };
  // 推荐和方案数据
  recommendations?: Recommendation[]; // 目的地推荐列表（当 routing.target === "recommendations" 时包含）
  plans?: Plan[]; // 方案候选列表（当 routing.target === "generate" 时包含）
  // MCP 服务响应数据
  hotels?: Hotel[]; // 酒店列表（当 routing.target === "hotel" 时包含）
  airbnbListings?: AirbnbListing[]; // Airbnb 房源列表（当 routing.target === "airbnb" 时包含）
  restaurants?: Restaurant[]; // 餐厅列表（当 routing.target === "restaurant" 时包含）
  weather?: WeatherInfo; // 天气信息（当 routing.target === "weather" 时包含）
  searchResults?: SearchResult[]; // 搜索结果（当 routing.target === "search" 时包含）
  flights?: Flight[]; // 航班列表（当 routing.target === "flight" 时包含）
  railRoutes?: RailRoute[]; // 铁路路线列表（当 routing.target === "rail" 时包含）
  translation?: TranslationResult; // 翻译结果（当 routing.target === "translate" 时包含）
  currencyConversion?: CurrencyConversion; // 货币转换结果（当 routing.target === "currency" 时包含）
  images?: ImageResult[]; // 图片列表（当 routing.target === "image" 时包含）
  // 其他字段
  actions?: Array<{
    type: string;
    data: any;
  }>;
  suggestions?: string[];
}

// ==================== 推荐类型 ====================

export interface RecommendationParams {
  q?: string;
  budget?: number;
  duration?: number;
  travelers?: number;
  interests?: string[];
  language?: 'en' | 'zh';
}

export interface Recommendation {
  id: string;
  countryCode?: string; // 国家代码（如 "IS"）
  name: string;
  nameCN?: string;
  description: string;
  descriptionCN?: string;
  highlights?: string[]; // 亮点（英文）
  highlightsCN?: string[]; // 亮点（中文）
  matchScore: number;
  matchReasons?: string[]; // 匹配原因（英文）
  matchReasonsCN?: string[]; // 匹配原因（中文）
  reasons?: string[]; // 兼容旧字段名
  estimatedBudget?: {
    min: number;
    max: number;
    currency: string;
  };
  bestSeasons?: string[];
  imageUrl?: string;
  tags?: string[];
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  total: number;
}

// ==================== 方案类型 ====================

export interface GeneratePlanRequest {
  sessionId: string;
  destination: string;
  duration: number;
  budget: number;
  travelers: {
    adults: number;
    children: number;
  };
  preferences?: {
    pace?: string;
    interests?: string[];
  };
  userId?: string;
}

export interface Plan {
  id: string;
  name: string;
  nameCN?: string;
  destination: string;
  duration: number;
  estimatedBudget: {
    total: number;
    breakdown: Record<string, number>;
  };
  pace: string;
  suitability: {
    score: number;
    reasons: string[];
  };
  highlights?: string[];
  warnings?: string[];
}

export interface GeneratePlanResponse {
  plans: Plan[];
  generatedAt: string;
  sessionId: string;
}

export interface AsyncTaskResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface TaskStatusResponse extends AsyncTaskResponse {
  progress?: number;
  result?: GeneratePlanResponse;
  error?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface ComparePlansParams {
  planIds: string;
  compareFields?: string;
  sessionId?: string;
  language?: 'en' | 'zh';
}

export interface ComparePlansResponse {
  plans: Array<{
    id: string;
    name: string;
    scores: Record<string, number>;
  }>;
  dimensions: string[];
  differences: Array<{
    field: string;
    plan1Value: any;
    plan2Value: any;
    impact: string;
    description: string;
    descriptionCN?: string;
  }>;
  recommendation: {
    bestBudget?: string;
    bestRoute?: string;
    summary: string;
    summaryCN?: string;
  };
}

export interface OptimizePlanRequest {
  sessionId: string;
  optimizationType: string;
  requirements: Record<string, any>;
}

export interface ConfirmPlanRequest {
  sessionId: string;
  userId?: string;
  saveToCalendar?: boolean;
  sendReminders?: boolean;
}

export interface ConfirmPlanResponse {
  success: boolean;
  tripId: string;
}

// ==================== 行程类型 ====================

export interface OptimizeTripRequest {
  sessionId: string;
  optimizationType: string;
  requirements: Record<string, any>;
}

export interface RefineTripRequest {
  sessionId: string;
  days?: number[];
  includeRestaurants?: boolean;
  includeTransportation?: boolean;
}

export interface TripOperationResponse {
  success: boolean;
  tripId: string;
}

export interface Suggestion {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  titleCN?: string;
  description: string;
  descriptionCN?: string;
  impact?: {
    timeSaved?: number;
    costSaved?: number;
  };
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  tripId: string;
}

// ==================== MCP 服务数据类型 ====================

// 酒店数据
export interface Hotel {
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number; // 1-4, 1=便宜, 4=昂贵
  types: string[];
  openingHours?: {
    openNow: boolean;
    weekdayText?: string[];
  };
  photos?: Array<{
    photoReference: string;
    width: number;
    height: number;
  }>;
  phoneNumber?: string;
  website?: string;
  reviews?: any[];
  amenities?: string[];
  roomTypes?: string[];
}

// Airbnb 房源数据
export interface AirbnbListing {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  price: {
    amount: number;
    currency: string;
  };
  rating?: number;
  reviewCount?: number;
  images?: string[];
  amenities?: string[];
  description?: string;
}

// 餐厅数据
export interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  types: string[];
  openingHours?: {
    openNow: boolean;
    weekdayText?: string[];
  };
  photos?: Array<{
    photoReference: string;
    width: number;
    height: number;
  }>;
  phoneNumber?: string;
  website?: string;
}

// 天气信息
export interface WeatherInfo {
  condition: string;
  temperature: number;
  humidity?: number;
  windSpeed?: number;
  description?: string;
  descriptionCN?: string;
}

// 搜索结果
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

// 航班数据
export interface Flight {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  airline?: string;
  flightNumber?: string;
}

// 铁路路线数据
export interface RailRoute {
  origin: string;
  destination: string;
  duration: string;
  price: {
    amount: number;
    currency: string;
  };
  departureTime?: string;
  arrivalTime?: string;
}

// 翻译结果
export interface TranslationResult {
  text: string;
  source: string;
  target: string;
}

// 货币转换结果
export interface CurrencyConversion {
  result: number;
  from: string;
  to: string;
  rate: number;
}

// 图片结果
export interface ImageResult {
  url: string;
  title?: string;
  width?: number;
  height?: number;
}

// ==================== 错误响应类型 ====================

export interface ErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  messageCN?: string;
  details?: Record<string, any>;
}
