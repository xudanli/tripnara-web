import type { PoiCoverageStatus, PoiType, SegmentCoverageStatus } from '@/api/readiness';

export type JourneyLayerKind =
  | 'activity'
  | 'diversion'
  | 'accommodation'
  | 'transport'
  | 'meeting'
  | 'risk';

export type MemberGroupId = 'young' | 'elderly' | 'children' | 'all';

export type InspectorTab =
  | 'activity'
  | 'participants'
  | 'diversion'
  | 'evidence'
  | 'risk';

export type IntensityLevel = 'low' | 'medium' | 'high';

export interface JourneyMember {
  id: string;
  name: string;
  initials: string;
  groupId: Exclude<MemberGroupId, 'all'>;
  avatarColor?: string;
}

export interface JourneyMemberGroup {
  id: Exclude<MemberGroupId, 'all'>;
  label: string;
  count: number;
}

export interface JourneyDay {
  id: string;
  dayIndex: number;
  label: string;
  routeLabel: string;
  /** TripDay.theme，供地图上下文条 */
  theme?: string;
  distanceKm: number;
  color: string;
  /** [lng, lat][] — 全天路线合并坐标（fitBounds / 回退） */
  routeCoordinates: [number, number][];
}

/** 覆盖地图路段 → 地图分层绘线 */
export interface JourneyRouteSegment {
  id: string;
  dayIndex: number;
  dayNumber: number;
  coordinates: [number, number][];
  color: string;
  coverageStatus?: SegmentCoverageStatus;
  /** 非 covered 路段虚线（与 CoverageMiniMap 一致） */
  dashed?: boolean;
}

export interface JourneyDiversionMerge {
  activityId: string;
  label: string;
  coordinates: [number, number];
  time?: string;
  polylineA?: string;
  polylineB?: string;
  geometrySource?: 'route_api' | 'straight_line' | 'cached_metadata';
}

export interface JourneyDiversion {
  id: string;
  dayIndex: number;
  title: string;
  groupA: {
    label: string;
    activityId: string;
    color: string;
    participantIds?: string[];
    /** encoded polyline：分叉点 → A 活动（贴路） */
    polyline?: string;
    geometrySource?: 'route_api' | 'straight_line' | 'cached_metadata';
  };
  groupB: {
    label: string;
    activityId: string;
    color: string;
    participantIds?: string[];
    polyline?: string;
    geometrySource?: 'route_api' | 'straight_line' | 'cached_metadata';
  };
  splitCoordinates: [number, number];
  /** 分叉前主路线 segment id 列表（有则只画这些段，避免与分支重叠） */
  trunkSegmentIds?: string[];
  /** fork 点 segment id；trunkSegmentIds 缺省时前端可据此推算 */
  forkAfterSegmentId?: string;
  merge?: JourneyDiversionMerge;
}

export type JourneyMarkerIcon =
  | 'hiking'
  | 'dining'
  | 'coffee'
  | 'accommodation'
  | 'camera'
  | 'parking'
  | 'sightseeing'
  | 'waterfall'
  | 'transport'
  | 'meeting'
  | 'city'
  | 'warning'
  | 'default';

export interface JourneyActivity {
  id: string;
  dayIndex: number;
  title: string;
  titleEn?: string;
  kind: JourneyLayerKind;
  lng: number;
  lat: number;
  startTime?: string;
  endTime?: string;
  /** 简短地点名 / 集合点 */
  location?: string;
  /** 完整地址（Place.address） */
  address?: string;
  /** 封面图 URL */
  imageUrl?: string;
  /** 地点详情 / 描述 */
  placeDetail?: string;
  intensity?: IntensityLevel;
  intensityScore?: number;
  elevationRange?: string;
  distanceKm?: number;
  ageRange?: string;
  durationHours?: number;
  transportMinutes?: number;
  equipment?: string[];
  weatherWindow?: string;
  guideInfo?: string;
  summary?: string;
  participantIds: string[];
  nonParticipantIds?: string[];
  diversionGroup?: 'A' | 'B';
  diversionLabel?: string;
  /** 地图标记 icon（高保真圆标 + 白色 pictogram） */
  markerIcon?: JourneyMarkerIcon;
  /** coverage POI 类型 → 决定 icon 与背景色 */
  poiType?: PoiType;
  /** 地图标记旁 pill 标签，如「B组·咖啡馆休息」 */
  markerLabel?: string;
  /** coverage POI 覆盖状态 → 标记底色与覆盖地图一致 */
  poiCoverageStatus?: PoiCoverageStatus;
  /** @deprecated 使用 markerIcon */
  emoji?: string;
}

export interface JourneyRiskPoint {
  id: string;
  dayIndex: number;
  title: string;
  lng: number;
  lat: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface JourneyStats {
  totalDays: number;
  totalDistanceKm: number;
  activityCount: number;
  diversionCount: number;
}

export interface JourneyDataFeed {
  id: string;
  label: string;
  updatedAt: string;
  status: 'fresh' | 'stale';
}

export interface JourneyMapModel {
  id?: string;
  tripTitle: string;
  tripSubtitle?: string;
  /** 如「6月25日 (周三) - 6月30日 (周一)」 */
  dateRangeLabel?: string;
  feasibilityScore: number;
  days: JourneyDay[];
  routeSegments: JourneyRouteSegment[];
  activities: JourneyActivity[];
  diversions: JourneyDiversion[];
  riskPoints: JourneyRiskPoint[];
  members: JourneyMember[];
  memberGroups: JourneyMemberGroup[];
  stats: JourneyStats;
  dataFeeds: JourneyDataFeed[];
  mapCenter: [number, number];
  mapZoom: number;
}

export const JOURNEY_LAYER_OPTIONS: Array<{
  id: JourneyLayerKind | 'all';
  label: string;
}> = [
  { id: 'all', label: '全部活动' },
  { id: 'diversion', label: '仅看分流活动' },
  { id: 'accommodation', label: '仅看住宿' },
  { id: 'transport', label: '仅看交通' },
];

export const INSPECTOR_TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'activity', label: '活动详情' },
  { id: 'participants', label: '参与人' },
  { id: 'diversion', label: '分流' },
  { id: 'evidence', label: '证据' },
  { id: 'risk', label: '风险与影响' },
];

/** 全程地图 · 按天分色（地图功能色 · 禁止 UI 紫） */
export const DAY_COLORS = [
  '#f97316', // Day 1 · 橙
  '#3b82f6', // Day 2 · 蓝
  '#0d9488', // Day 3 · 青绿
  '#22c55e', // Day 4 · 绿
  '#ef4444', // Day 5 · 红
  '#14b8a6', // Day 6 · 青
] as const;
