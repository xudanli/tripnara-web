import type { BaseEntity, Coordinates } from './common';
import type { RouteDirection } from './places-routes';

// ==================== 基础类型 ====================

export type TrailDifficulty = 'easy' | 'moderate' | 'hard' | 'expert';
export type LoopType = 'loop' | 'out-and-back' | 'point-to-point';
export type TrailCondition = 'dirt' | 'rock' | 'snow' | 'glacier' | 'water-crossing';
export type RiskTag = 
  | 'exposure' 
  | 'river_crossing' 
  | 'snow' 
  | 'rockfall' 
  | 'signal_blackout'
  | 'avalanche'
  | 'altitude';

// ==================== 徒步路线详情 ====================

export interface TrailSegment {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  slope?: number; // 坡度百分比
  exposure?: number; // 暴露度 0-100
  estimatedTimeMin: number;
  keyNodes?: TrailKeyNode[];
  riskTags?: RiskTag[];
}

export interface TrailKeyNode {
  id: string;
  type: 'water_source' | 'shelter' | 'camp' | 'viewpoint' | 'water_crossing' | 'exit_point';
  name: string;
  coordinates: Coordinates;
  elevationM?: number;
  description?: string;
  seasonal?: boolean; // 是否季节性可用
}

export interface TrailDetail extends BaseEntity {
  // 基础信息
  trailId: string;
  name: string;
  nameCN?: string;
  nameEN?: string;
  region: string;
  countryCode: string;
  
  // 路线结构
  startPoint: Coordinates;
  endPoint: Coordinates;
  loopType: LoopType;
  geometryPolyline?: string; // 路线线条（编码的坐标串）
  
  // 核心指标
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  minElevationM: number;
  estimatedTimeMin: number; // 建议分季节
  difficulty: TrailDifficulty;
  
  // 分段信息
  segments: TrailSegment[];
  
  // 海拔剖面数据
  elevationProfile?: ElevationPoint[];
  
  // 风险与约束
  riskTags: RiskTag[];
  waterSources: TrailKeyNode[];
  shelters: TrailKeyNode[];
  camps: TrailKeyNode[];
  exitPoints: TrailKeyNode[];
  
  // 季节性
  seasonality?: {
    bestMonths: number[]; // 1-12
    avoidMonths: number[];
    monthlyRecommendation?: Record<number, number>; // 月份 -> 推荐度 0-100
  };
  
  // 封路/关闭信息
  opening?: {
    startMonth?: number;
    endMonth?: number;
    closureReasons?: string[];
  };
  
  // 关联的 RouteDirection
  routeDirectionId?: number;
  routeDirection?: RouteDirection;
  
  // 媒体
  images?: string[];
  description?: string;
}

export interface ElevationPoint {
  distanceKm: number;
  elevationM: number;
  coordinates?: Coordinates;
}

// ==================== 可走指数 ====================

export interface TrailReadinessScore {
  score: number; // 0-100
  factors: {
    weather: number;
    route: number;
    personal: number;
  };
  blockers: string[]; // 关键原因
}

// ==================== 徒步计划 ====================

export interface HikePlan extends BaseEntity {
  trailId: string;
  trail?: TrailDetail;
  plannedDate: string; // ISO date
  plannedStartTime?: string; // HH:mm
  durationDays?: number;
  
  // 人员信息
  participants?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // 准备状态
  checklistCompleted?: boolean;
  permitsObtained?: boolean;
  transportArranged?: boolean;
  offlinePackDownloaded?: boolean;
  
  // 状态
  status: 'planning' | 'ready' | 'in-progress' | 'completed' | 'cancelled';
  
  // 关联的 Readiness 评估
  readinessId?: string;
}

// ==================== 准备清单 ====================

export interface PrepChecklist {
  id: string;
  category: 'essential' | 'clothing' | 'safety' | 'navigation' | 'food' | 'shelter';
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  required: boolean;
  checked: boolean;
  reason?: string; // 为什么需要（基于温度、风险等）
}

export interface PrepPermit {
  id: string;
  name: string;
  required: boolean;
  obtained: boolean;
  bookingUrl?: string;
  capacity?: number;
  deadline?: string;
  cost?: number;
}

export interface PrepTransport {
  type: 'drive' | 'bus' | 'shuttle' | 'other';
  toTrailhead: {
    method: string;
    details?: string;
    parkingLocation?: Coordinates;
    estimatedDuration?: number;
  };
  fromTrailhead: {
    method: string;
    details?: string;
    lastDeparture?: string; // HH:mm
  };
}

export interface OfflinePack {
  trailId: string;
  mapData?: string; // 离线地图数据
  trackData?: string; // GPS轨迹
  emergencyContacts?: EmergencyContact[];
  exitPoints?: TrailKeyNode[];
  downloadedAt?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  type: 'rescue' | 'park' | 'local';
}

// ==================== 执行状态 ====================

export interface OnTrailState {
  hikePlanId: string;
  currentLocation?: Coordinates;
  currentElevation?: number;
  currentSegmentId?: string;
  
  // 进度
  distanceCompletedKm: number;
  elevationGainedM: number;
  timeElapsedMin: number;
  
  // 实时状态
  estimatedArrivalTime?: string; // ISO datetime
  sunsetCountdownMin?: number;
  isOffline?: boolean;
  
  // 风险状态
  activeRisks?: TrailRiskAlert[];
  
  // 节奏状态
  paceStatus?: {
    currentPace: number; // km/h
    plannedPace: number;
    bufferRemainingMin: number;
    latestTurnaroundTime?: string; // HH:mm
  };
  
  // 修复建议
  repairSuggestions?: TrailRepairSuggestion[];
  
  // 事件记录
  events: TrailEvent[];
}

export interface TrailRiskAlert {
  id: string;
  type: 'weather' | 'wind' | 'fatigue' | 'time' | 'route';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold?: {
    metric: string;
    value: number;
    current: number;
  };
  suggestedAction?: 'continue' | 'turnaround' | 'shelter' | 'abort';
}

export interface TrailRepairSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'shortcut' | 'turnaround' | 'skip_segment' | 'exit_point';
  changes: {
    distanceChangeKm?: number;
    timeChangeMin?: number;
    elevationChangeM?: number;
  };
  targetPoint?: {
    name: string;
    coordinates: Coordinates;
    distanceFromStartKm: number;
  };
}

export interface TrailEvent {
  id: string;
  type: 'arrival' | 'departure' | 'rest' | 'skip' | 'replace' | 'risk' | 'turnaround';
  timestamp: string; // ISO datetime
  location?: Coordinates;
  segmentId?: string;
  notes?: string;
  audioNote?: string; // 语音备注 URL
}

// ==================== 复盘 ====================

export interface HikeReview extends BaseEntity {
  hikePlanId: string;
  trailId: string;
  completedDate: string;
  
  // 执行摘要
  actualDistanceKm: number;
  actualDurationMin: number;
  actualElevationGainedM: number;
  
  // 事件钉子（在海拔剖面上）
  elevationEvents: ElevationEvent[];
  
  // 洞察
  insights: HikeInsight[];
  
  // 锚点规则
  anchorRules: AnchorRule[];
  
  status: 'draft' | 'generated' | 'user_confirmed' | 'archived';
}

export interface ElevationEvent {
  id: string;
  type: 'delay' | 'fatigue' | 'wind' | 'water_crossing' | 'turnaround' | 'skip';
  distanceKm: number;
  elevationM: number;
  timestamp: string;
  description: string;
  impact?: 'positive' | 'negative' | 'neutral';
}

export interface HikeInsight {
  id: string;
  category: 'highlight' | 'friction' | 'rhythm' | 'safety' | 'decision';
  title: string;
  description: string;
  evidence?: string[];
  userFeedback?: 'agree' | 'disagree' | 'edit';
}

export interface AnchorRule {
  id: string;
  condition: string; // "风速 > 12m/s 的暴露山脊"
  action: string; // "不走"
  context?: string; // "下次自动更稳"
  priority: 'high' | 'medium' | 'low';
}

