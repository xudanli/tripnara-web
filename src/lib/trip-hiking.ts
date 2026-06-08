import type { HikingLevel } from '@/types/trip';
import type { HikingProfile } from '@/types/hiking-embedded';
import { HARD_TREK_ROUTE_DIRECTION_NAMES } from '@/lib/hiking-trail-detail-ui';
import { resolveLongestHike } from '@/lib/longest-hike-resolve';
import { parseHikingSegments } from '@/lib/hiking-segments';

const ICELAND_CODES = new Set(['IS', 'ICELAND', '冰岛']);

/** 根据目的地推断路线方向（朗格迈维卢尔 Demo / 审计） */
export function inferRouteDirectionName(destination?: string): string | undefined {
  if (!destination) return undefined;
  const d = destination.trim().toUpperCase();
  if (ICELAND_CODES.has(d) || d.includes('ICELAND') || destination.includes('冰岛')) {
    return 'IS_LAUGAVEGUR';
  }
  return undefined;
}

/**
 * 创建/保存行程时写入 metadata，触发后端徒步审计
 * @see routeDirectionName + tags: ["徒步"]
 */
export function buildHikingAuditMetadata(opts: {
  hikingLevel?: HikingLevel;
  destination?: string;
  routeDirectionName?: string;
}): Record<string, unknown> | undefined {
  const { hikingLevel = 'none', destination, routeDirectionName } = opts;
  if (hikingLevel === 'none') return undefined;

  const rd = routeDirectionName ?? inferRouteDirectionName(destination);
  const meta: Record<string, unknown> = {
    tags: ['徒步'],
    hikingLevel,
  };
  if (rd) meta.routeDirectionName = rd;
  return meta;
}

/** 徒步形态：embedded 混合 / primary 整单硬核 / none */
export function getTripHikingProfile(trip: {
  metadata?: Record<string, unknown>;
  destination?: string;
} | null | undefined): HikingProfile {
  if (!trip) return 'none';
  const md = trip.metadata ?? {};
  const explicit = md.hikingProfile as HikingProfile | undefined;
  if (explicit === 'embedded' || explicit === 'primary' || explicit === 'none') {
    return explicit;
  }
  // REL2：无 hikingProfile 时由 hardTrekTrailPlan / 徒步 tags 推断 primary
  if (md.hardTrekTrailPlan && typeof md.hardTrekTrailPlan === 'object') return 'primary';
  if (tripIncludesHikingLegacy(trip)) return 'primary';
  return 'none';
}

/** 整单硬核徒步（Plan Studio 整单 generate-plan / 行前徒步 Tab） */
export function isPrimaryHikingTrip(
  trip: { metadata?: Record<string, unknown>; destination?: string } | null | undefined
): boolean {
  return getTripHikingProfile(trip) === 'primary';
}

/** 混合出行 embedded */
export function isEmbeddedHikingTrip(
  trip: { metadata?: Record<string, unknown>; destination?: string } | null | undefined
): boolean {
  return getTripHikingProfile(trip) === 'embedded';
}

/** 创建 embedded Trip 时的 metadata */
export function buildEmbeddedHikingMetadata(opts: {
  segments?: import('@/types/hiking-embedded').HikingSegment[];
  destination?: string;
}): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    hikingProfile: 'embedded',
    hikingLevel: 'light',
    tags: ['徒步'],
  };
  if (opts.segments?.length) meta.hikingSegments = opts.segments;
  const rd = inferRouteDirectionName(opts.destination);
  if (rd) meta.routeDirectionName = rd;
  return meta;
}

function tripIncludesHikingLegacy(trip: {
  metadata?: Record<string, unknown>;
  destination?: string;
} | null | undefined): boolean {
  if (!trip) return false;
  const md = trip.metadata ?? {};
  const tags = (md.tags as string[] | undefined) ?? [];
  if (tags.some((t) => t === '徒步' || /hiking/i.test(t))) return true;
  const rd = md.routeDirectionName as string | undefined;
  if (rd && (HARD_TREK_ROUTE_DIRECTION_NAMES as readonly string[]).includes(rd)) return true;
  if (rd && /LAUGAVEGUR|徒步|TREK|EBC/i.test(rd)) return true;
  if (typeof md.hikingLevel === 'string' && md.hikingLevel !== 'none') return true;
  if (inferRouteDirectionName(trip.destination)) return true;
  return false;
}

/** 判断行程是否含徒步（行前审计 / Trail 计划）— 含 embedded */
export function tripIncludesHiking(trip: {
  metadata?: Record<string, unknown>;
  destination?: string;
} | null | undefined): boolean {
  const profile = getTripHikingProfile(trip);
  if (profile === 'embedded' || profile === 'primary') return true;
  return tripIncludesHikingLegacy(trip);
}

/** 是否应在详情页展示整单 HardTrek 时间轴（仅 primary） */
export function shouldShowWholeTripHardTrek(
  trip: { metadata?: Record<string, unknown>; destination?: string } | null | undefined
): boolean {
  return isPrimaryHikingTrip(trip);
}

/** 解析片段列表 */
export function getTripHikingSegments(trip: {
  metadata?: Record<string, unknown>;
} | null | undefined) {
  return parseHikingSegments(trip?.metadata);
}

/** POST /demo/hiking/trail-plan/preview 请求体 */
export function buildTrailPlanPreviewBody(
  trip: {
    destination?: string;
    metadata?: Record<string, unknown>;
  },
  placeIds: string[] = []
): {
  routeDirectionName: string;
  longestHike: number;
  placeIds: string[];
} {
  const md = trip.metadata ?? {};
  return {
    routeDirectionName:
      (md.routeDirectionName as string) ??
      inferRouteDirectionName(trip.destination) ??
      'IS_LAUGAVEGUR',
    longestHike: resolveLongestHike(),
    placeIds,
  };
}
