import { BRAND_MAP_TUNDRA_HEX } from '@/lib/brand-map-colors';
import { SEMANTIC_NEUTRAL_HEX, SEMANTIC_WARNING_HEX } from '@/lib/semantic-colors';

/** 执行页地图 · Layer B token（Canvas/Mapbox hex，禁止 Tailwind 彩虹类） */
export const EXECUTE_ROUTE_MAP = {
  /** 当前进行中路线的描边色 */
  routeActiveHex: '#334155',
  /** 已完成 / 次要路线 */
  routeDoneHex: SEMANTIC_NEUTRAL_HEX,
  /** 计划路线（虚线） */
  routePlannedHex: '#94A3B8',
  /** 备选 Plan B 路线（虚线） */
  routePlanBHex: SEMANTIC_WARNING_HEX,
  /** 当前车辆标记 */
  vehicleMarkerHex: '#0F172A',
  /** 普通途经点 */
  stopMarkerHex: '#334155',
  /** Plan B 途经点 */
  planBStopHex: BRAND_MAP_TUNDRA_HEX,
} as const;

export const EXECUTE_ROUTE_MAP_LEGEND = [
  { label: '已完成', color: EXECUTE_ROUTE_MAP.routeDoneHex, dashed: false },
  { label: '进行中', color: EXECUTE_ROUTE_MAP.routeActiveHex, dashed: false },
  { label: '计划路线', color: EXECUTE_ROUTE_MAP.routePlannedHex, dashed: true },
  { label: '备选路线', color: EXECUTE_ROUTE_MAP.routePlanBHex, dashed: true },
] as const;
