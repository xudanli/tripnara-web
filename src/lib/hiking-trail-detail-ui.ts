import type { RouteDirection } from '@/types/places-routes';
import type { HikingPermit, HikingTrailDetail, RiskLevelLabel } from '@/types/hiking-trail-detail';
import type { DaySkeleton, SupplyPoi } from '@/types/hiking';

export const HARD_TREK_ROUTE_DIRECTION_NAMES = [
  'IS_LAUGAVEGUR',
  'IS_TREKKING_WILDERNESS',
  'NEPAL_EBC_TREK',
] as const;

export type HardTrekRouteDirectionName = (typeof HARD_TREK_ROUTE_DIRECTION_NAMES)[number];

export function isHardTrekRouteName(name?: string): name is HardTrekRouteDirectionName {
  return Boolean(name && HARD_TREK_ROUTE_DIRECTION_NAMES.includes(name as HardTrekRouteDirectionName));
}

export function trailHasHikingTag(trail: RouteDirection | null | undefined): boolean {
  if (!trail) return false;
  return (
    trail.tags?.some((t) => t === '徒步' || /hiking/i.test(t)) ||
    Boolean(trail.hikingDetail) ||
    Boolean(trail.routeDirectionName && isHardTrekRouteName(trail.routeDirectionName))
  );
}

export function riskLevelZh(level?: RiskLevelLabel): string {
  if (!level) return '待评估';
  return { low: '低', medium: '中', high: '高' }[level];
}

export function boolZh(v?: boolean): string {
  if (v === undefined) return '待评估';
  return v ? '是' : '否';
}

export function pickPolyline(hd?: HikingTrailDetail): Array<{ lat: number; lng: number }> {
  if (!hd) return [];
  return hd.geometry?.polyline ?? hd.polyline ?? [];
}

export function pickDaySkeleton(hd?: HikingTrailDetail): DaySkeleton[] {
  return hd?.daySkeleton ?? [];
}

export function pickSupplyPois(hd?: HikingTrailDetail): SupplyPoi[] {
  return hd?.supplyPois ?? [];
}

export function pickHikingPermits(hd?: HikingTrailDetail): HikingPermit[] {
  return hd?.permits ?? [];
}

export function hikingPermitLabel(p: HikingPermit): string {
  return p.titleZh?.trim() || p.nameCN?.trim() || p.name?.trim() || p.id;
}

/** Admin override 多为行数组；兼容旧版对象矩阵 */
export type HikingRiskMatrixRow = {
  id: string;
  label?: string;
  labelCN?: string;
  value?: string;
  level?: RiskLevelLabel;
};

/** C 端风险 Tab：优先 Admin merge 的 riskMatrixRows */
export function pickRiskMatrixRows(hd?: HikingTrailDetail): HikingRiskMatrixRow[] {
  if (!hd) return [];
  if (hd.riskMatrixRows?.length) return hd.riskMatrixRows;
  return normalizeRiskMatrixRows(hd.riskMatrix);
}

export function normalizeRiskMatrixRows(
  riskMatrix?: HikingTrailDetail['riskMatrix'] | HikingRiskMatrixRow[]
): HikingRiskMatrixRow[] {
  if (!riskMatrix) return [];
  if (Array.isArray(riskMatrix)) return riskMatrix;
  const m = riskMatrix;
  return [
    { id: 'weather', labelCN: '天气敏感度', value: riskLevelZh(m.weatherSensitivity), level: m.weatherSensitivity },
    { id: 'exposure', labelCN: '暴露路段', value: riskLevelZh(m.exposureLevel), level: m.exposureLevel },
    { id: 'river', labelCN: '涉水', value: boolZh(m.riverCrossing) },
    { id: 'altitude', labelCN: '高反风险', value: boolZh(m.altitudeSickness) },
    { id: 'road', labelCN: '封路风险', value: boolZh(m.roadClosureRisk) },
    { id: 'signal', labelCN: '信号盲区', value: boolZh(m.signalBlackout) },
  ];
}

export function isHikingRiskSectionEmpty(detail: HikingTrailDetail): boolean {
  return (
    pickRiskMatrixRows(detail).length === 0 &&
    !detail.hardGates?.length &&
    !detail.emergency?.rescuePhone &&
    !detail.emergency?.registrationPointZh &&
    !detail.emergency?.nearestExitPoints?.length &&
    !detail.weatherRisk?.headlineZh
  );
}

export function isHikingLogisticsSectionEmpty(detail: HikingTrailDetail): boolean {
  const access = detail.access;
  return (
    !access?.driving &&
    !access?.transit &&
    !access?.byCar &&
    !access?.byBus &&
    !detail.supplyPois?.length &&
    !detail.shelters?.length &&
    !pickHikingPermits(detail).length &&
    !detail.timeWindows?.suggestedDepartTime
  );
}

export function hasMeaningfulHikingDetail(hd?: HikingTrailDetail): boolean {
  if (!hd) return false;
  return (
    Boolean(hd.summary) ||
    pickPolyline(hd).length > 0 ||
    pickDaySkeleton(hd).length > 0 ||
    pickSupplyPois(hd).length > 0 ||
    pickRiskMatrixRows(hd).length > 0 ||
    Boolean(hd.hardGates?.length) ||
    Boolean(hd.emergency?.rescuePhone) ||
    Boolean(hd.access?.driving || hd.access?.transit || hd.access?.byCar || hd.access?.byBus) ||
    pickHikingPermits(hd).length > 0
  );
}

type RouteListMetadata = {
  totalDistanceKm?: number;
  estimatedDuration?: number | string;
  estimatedDays?: number;
};

function routeListMetadata(trail: RouteDirection): RouteListMetadata | undefined {
  return (trail as RouteDirection & { metadata?: RouteListMetadata }).metadata;
}

export function listReadinessScore(trail: RouteDirection): number | undefined {
  return trail.readinessScore ?? trail.hikingDetail?.summary?.readinessScore;
}

export function listTotalDistanceKm(trail: RouteDirection): number | undefined {
  const meta = routeListMetadata(trail);
  return (
    trail.totalDistanceKm ??
    meta?.totalDistanceKm ??
    trail.hikingDetail?.summary?.totalDistanceKm ??
    trail.hikingDetail?.terrainSummary?.totalDistanceKm
  );
}

export function listTotalAscentM(trail: RouteDirection): number | undefined {
  const meta = routeListMetadata(trail) as { totalAscentM?: number };
  return (
    trail.totalAscentM ??
    meta?.totalAscentM ??
    trail.hikingDetail?.summary?.totalAscentM
  );
}

/** 列表地图 marker：优先 startPoint，其次 center */
export function listMapCoordinates(
  trail: RouteDirection
): { lat: number; lng: number; label?: string } | null {
  const sp = trail.startPoint;
  if (sp?.lat != null && sp?.lng != null) {
    return { lat: sp.lat, lng: sp.lng, label: sp.nameCN };
  }
  const c = (trail as RouteDirection & { center?: { lat: number; lng: number } }).center;
  if (c?.lat != null && c?.lng != null) {
    return { lat: c.lat, lng: c.lng, label: trail.startPointLabel ?? trail.nameCN };
  }
  return null;
}

export function listStartPointLabel(trail: RouteDirection): string | undefined {
  return trail.startPointLabel ?? trail.startPoint?.nameCN ?? trail.metadata?.startPointLabel as string | undefined;
}

export function listEstimatedDays(trail: RouteDirection): number | undefined {
  const meta = routeListMetadata(trail);
  if (trail.estimatedDays != null) return trail.estimatedDays;
  if (meta?.estimatedDays != null) return meta.estimatedDays;
  const dur = meta?.estimatedDuration;
  if (typeof dur === 'number') return dur;
  return trail.hikingDetail?.summary?.suggestedDays ?? trail.constraints?.minDays;
}
