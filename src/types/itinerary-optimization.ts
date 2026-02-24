// ==================== 行程规划模块类型定义 ====================

// LLM 提供商
export type LlmProvider = 'openai' | 'gemini' | 'deepseek' | 'anthropic';

// 强度等级
export type Intensity = 'LOW' | 'MEDIUM' | 'HIGH';

// 数据类型（用于人性化转化）
export type DataType = 
  | 'itinerary_optimization' 
  | 'what_if_evaluation' 
  | 'trip_schedule' 
  | 'transport_plan';

// ==================== 接口 1: 优化路线 ====================

/** 优化接口支持的交通方式 */
export type OptimizeTravelMode = 'TRANSIT' | 'WALKING' | 'DRIVING';

/** 交通偏好（可选，用于老人/自驾等场景） */
export interface TransportPreferences {
  lessWalking?: boolean;   // 少步行（适合老人）
  avoidHighways?: boolean; // 不走高速
  avoidTolls?: boolean;    // 避免收费
}

export interface OptimizeRouteConfig {
  date: string; // ISO 8601 date: YYYY-MM-DD
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  pacingFactor?: number; // 1.0 = 标准, 1.5 = 慢节奏, 0.7 = 快节奏
  hasChildren?: boolean;
  hasElderly?: boolean;
  /** 交通方式：不传则后端根据 hasChildren/hasElderly 自动选择 */
  defaultTravelMode?: OptimizeTravelMode;
  /** 交通偏好：仅传有值的字段 */
  transportPreferences?: TransportPreferences;
  lunchWindow?: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  dinnerWindow?: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  useVRPTW?: boolean;
}

export interface OptimizeRouteRequest {
  placeIds: number[];
  config: OptimizeRouteConfig;
  /** 行程 UUID，应用优化结果时必需 */
  tripId: string;
  /** TripDay 的 UUID，指定要优化的日期 */
  dayId: string;
}

export interface PlaceNode {
  id: number;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
  };
  intensity?: Intensity;
  estimatedDuration?: number;
  openingHours?: {
    start?: string; // HH:mm
    end?: string; // HH:mm
  };
  isRestaurant?: boolean;
  isRest?: boolean;
}

export interface ScheduleItem {
  nodeIndex: number;
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  transportTime?: number | null; // 分钟
}

export interface ScoreBreakdown {
  interestScore: number;
  distancePenalty: number;
  tiredPenalty: number;
  boredPenalty: number;
  starvePenalty: number;
  clusteringBonus: number;
  bufferBonus: number;
}

export interface Zone {
  id: number;
  centroid: {
    lat: number;
    lng: number;
  };
  places: Array<{
    id: number;
    name: string;
    category?: string;
    location?: {
      lat: number;
      lng: number;
    };
  }>;
  radius: number;
}

export interface OptimizeRouteResponse {
  nodes: PlaceNode[];
  schedule: ScheduleItem[];
  happinessScore: number;
  scoreBreakdown: ScoreBreakdown;
  zones?: Zone[];
}

// ==================== 接口 2: 自然语言转参数 ====================

export interface NaturalLanguageToParamsRequest {
  text: string;
  provider?: LlmProvider;
}

export interface TripCreationParams {
  destination: string; // ISO 3166-1 alpha-2 国家代码
  startDate: string; // ISO 8601 datetime
  endDate: string; // ISO 8601 datetime
  totalBudget: number; // 人民币
  hasChildren?: boolean;
  hasElderly?: boolean;
  preferences?: Record<string, any>;
}

export interface NaturalLanguageToParamsResponse {
  success: true;
  data: TripCreationParams;
  message: string;
}

// ==================== 接口 3: 结果人性化转化 ====================

export interface HumanizeResultRequest {
  data: Record<string, any>;
  dataType: DataType;
  provider?: LlmProvider;
}

export interface HumanizeResultResponse {
  success: true;
  data: {
    description: string;
  };
  message: string;
}

