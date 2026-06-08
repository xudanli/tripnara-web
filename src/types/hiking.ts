/**
 * 徒步模块 API 类型（Demo / 行前审计 / Trail 计划）
 * @see 后端 Swagger: Hiking Demo (Phase 1)
 */

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

export type ComputeStepId =
  | 'dem.elevation_profile'
  | 'decision.fitness_match'
  | 'world.weather_risk';

export type ComputeStep = {
  id: ComputeStepId;
  labelZh: string;
  labelEn: string;
  service: string;
  status: 'completed' | 'cached_fallback' | 'skipped';
  latencyMs: number;
  summary?: Record<string, unknown>;
};

export type ElevationProfilePoint = {
  distance: number;
  lat: number;
  lng: number;
  elevation: number;
  slope: number;
  cumulativeAscent: number;
};

export type DaySkeleton = {
  day: number;
  theme: string;
  distanceKm: number;
  ascentM: number;
};

export type DayPaceVerdict = {
  day: number;
  verdict: string;
  noteZh: string;
};

export type SupplyPoi = {
  id: string;
  nameCN: string;
  nameEN: string;
  subCategory: string;
  lat: number;
  lng: number;
  role?: string;
  elevation_m?: number;
};

export type LaugavegurSnapshot = {
  daySkeleton: DaySkeleton[];
  supplyPois: SupplyPoi[];
  polyline?: Array<{ lat: number; lng: number }>;
};

export type LaugavegurPreview = {
  elevationProfile: ElevationProfilePoint[];
  terrainSummary: {
    cumulativeAscentM: number;
    maxSlopePct: number;
    totalDistanceKm: number;
    effortScore: number;
    difficulty: string;
    dataSource: 'live_dem' | 'cached_fixture';
  };
  fitnessMatch: {
    longestHike: number;
    maxDailyAscentM: number;
    suggestedDays: number;
    dayPaceVerdict: DayPaceVerdict[];
  };
  weatherRisk: { level: string; headlineZh: string; rules: string[] };
  computeSteps: ComputeStep[];
  daySkeleton: DaySkeleton[];
  supplyPois: SupplyPoi[];
  polyline?: Array<{ lat: number; lng: number }>;
};

export type GearChecklistItem = {
  id: string;
  nameZh: string;
  level: 'must' | 'should' | 'optional';
  checked?: boolean;
};

export type HikingAuditData = {
  eligible: boolean;
  reasonZh?: string;
  /** 行程计划总天数（如 Trip 7 天） */
  tripPlannedDays?: number;
  /** 绑定路线建议徒步天数（如 Laugavegur 4 天） */
  routeSuggestedDays?: number;
  terrainAdvice?: {
    adaptationStrategies: string[];
    riskThresholds: Array<{ labelZh: string; value: string }>;
  };
  gearChecklist?: GearChecklistItem[];
  readinessFindings?: {
    must?: Array<{ message: string; tasks?: string[] }>;
    should?: Array<{ message: string; tasks?: string[] }>;
  };
};

export type HardTrekTrailSegment = {
  day: number;
  theme: string;
  distanceKm: number;
  ascentM: number;
  suitable: boolean;
  noteZh?: string;
  trailName?: string;
};

export type HardTrekTrailPlan = {
  mode: 'trail_segments' | 'poi_fallback';
  segments: HardTrekTrailSegment[];
  summary: {
    suggestedDays: number;
    maxDailyAscentM: number;
    totalDistanceKm: number;
  };
  messageZh: string;
};

export type TrailPlanPreviewRequest = {
  routeDirectionName: string;
  longestHike: number;
  placeIds: string[];
};
