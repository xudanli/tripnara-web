/**
 * GET /api/route-directions/:id?longestHike= — 仅消费 data.hikingDetail（override 已由后端 merge）
 * @see docs/api/HIKING_ROUTE_DIRECTION_DETAIL.md
 */

import type {
  DaySkeleton,
  DayPaceVerdict,
  ElevationProfilePoint,
  SupplyPoi,
} from '@/types/hiking';

export type RiskLevelLabel = 'low' | 'medium' | 'high';

export type HikingTrailSummary = {
  totalDistanceKm: number;
  totalAscentM: number;
  totalDescentM?: number;
  suggestedDays: number;
  estimatedTimeMin?: number;
  maxElevationM: number;
  minElevationM?: number;
  difficulty: string;
  readinessScore?: number;
  loopType?: 'point_to_point' | 'loop' | 'out_and_back';
};

export type HikingTrailGeometry = {
  polyline: Array<{ lat: number; lng: number }>;
  startPoint?: { lat: number; lng: number; nameCN?: string };
  endPoint?: { lat: number; lng: number; nameCN?: string };
};

export type HikingTerrainSummary = {
  cumulativeAscentM: number;
  maxSlopePct: number;
  totalDistanceKm: number;
  effortScore: number;
  difficulty: string;
  dataSource: 'live_dem' | 'cached_fixture';
};

export type HikingFitnessMatch = {
  longestHike: number;
  maxDailyAscentM: number;
  suggestedDays: number;
  dayPaceVerdict: DayPaceVerdict[];
};

export type HikingWeatherRisk = {
  level: string;
  headlineZh: string;
  rules: string[];
};

export type HikingRiskMatrixRow = {
  id: string;
  label?: string;
  labelCN?: string;
  value?: string;
  level?: RiskLevelLabel;
};

export type HikingRiskMatrix = {
  weatherSensitivity: RiskLevelLabel;
  exposureLevel: RiskLevelLabel;
  riverCrossing: boolean;
  altitudeSickness: boolean;
  roadClosureRisk: boolean;
  signalBlackout: boolean;
  riskTags?: string[];
};

export type HikingHardGate = {
  id: string;
  category: string;
  titleZh: string;
  ruleZh: string;
  threshold?: string;
};

export type HikingEmergency = {
  rescuePhone?: string;
  registrationPointZh?: string;
  nearestExitPoints?: Array<{
    nameZh: string;
    lat?: number;
    lng?: number;
    distanceKm?: number;
    noteZh?: string;
  }>;
};

/** Admin override 可能为简短文案 */
export type HikingAccess = {
  byCar?: string;
  byBus?: string;
  driving?: {
    parkingNameZh: string;
    parkingLat?: number;
    parkingLng?: number;
    driveDurationMin?: number;
    driveDistanceKm?: number;
    noteZh?: string;
  };
  transit?: {
    scheduleZh: string;
    bookingUrl?: string;
    seasonNoteZh?: string;
  };
};

export type HikingShelter = SupplyPoi & {
  capacity?: number;
  bookingRequired?: boolean;
  bookingUrl?: string;
  feeZh?: string;
  openSeason?: string;
};

export type HikingSupplies = {
  waterDensity?: RiskLevelLabel;
  waterSources?: Array<{ nameZh: string; lat?: number; lng?: number; seasonal?: string }>;
  toilets?: Array<{ nameZh: string; lat?: number; lng?: number }>;
};

export type HikingTimeWindows = {
  suggestedDepartTime?: string;
  lastReturnBusTime?: string;
  sunsetBufferMin?: number;
  daylightHoursNoteZh?: string;
};

/** hikingDetail.permits — 准备页 prep 模板来源之一 */
export type HikingPermit = {
  id: string;
  nameCN?: string;
  name?: string;
  titleZh?: string;
  required?: boolean;
  bookingUrl?: string;
  capacity?: number;
  deadline?: string;
  cost?: number;
};

export type HikingAlternatives = {
  planBRoutes: Array<{
    id: string;
    titleZh: string;
    summaryZh: string;
    distanceKm?: number;
    reasonZh?: string;
    routeDirectionId?: number;
  }>;
  exitPoints: Array<{
    id: string;
    nameZh: string;
    distanceAlongTrailKm: number;
    lat?: number;
    lng?: number;
    noteZh?: string;
  }>;
  repairHints: Array<{
    scenario: 'delay' | 'fatigue' | 'weather' | 'injury' | string;
    titleZh: string;
    actionZh: string;
  }>;
};

/** 路线详情页 data.hikingDetail 全量 */
export type HikingTrailDetail = {
  summary?: HikingTrailSummary;
  geometry?: HikingTrailGeometry;
  /** 与 geometry.polyline 二选一或并存 */
  polyline?: Array<{ lat: number; lng: number }>;
  daySkeleton?: DaySkeleton[];
  elevationProfile?: ElevationProfilePoint[];
  terrainSummary?: HikingTerrainSummary;
  fitnessMatch?: HikingFitnessMatch;
  weatherRisk?: HikingWeatherRisk;
  supplyPois?: SupplyPoi[];
  shelters?: HikingShelter[];
  segments?: Array<Record<string, unknown>>;
  /** Admin merge 后表格风险（P0 主字段，勿用枚举版 riskMatrix） */
  riskMatrixRows?: HikingRiskMatrixRow[];
  /** @deprecated fixture 枚举矩阵；C 端展示请用 riskMatrixRows */
  riskMatrix?: HikingRiskMatrix;
  hardGates?: HikingHardGate[];
  emergency?: HikingEmergency;
  access?: HikingAccess;
  supplies?: HikingSupplies;
  timeWindows?: HikingTimeWindows;
  /** 许可/预约（创建 HikePlan / refresh-template 时写入 prep.permits） */
  permits?: HikingPermit[];
  alternatives?: HikingAlternatives;
  /** 仅 URL 预览；准备页应走 GET /hiking/route-directions/:id/offline-pack 拿 checksum */
  offlinePackHints?: {
    geojsonUrl?: string;
    tileManifestUrl?: string;
    version?: string;
    sizeBytes?: number;
  };
};

/** 列表项扩展字段 */
export type HikingRouteDirectionListExtras = {
  routeDirectionName?: string;
  readinessScore?: number;
  totalDistanceKm?: number;
  totalAscentM?: number;
  estimatedDays?: number;
  startPoint?: { lat: number; lng: number; nameCN?: string };
  startPointLabel?: string;
};
