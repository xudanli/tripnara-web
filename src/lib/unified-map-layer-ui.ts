import type { RouteAndRunResponse } from '@/api/agent';
import {
  isUnifiedMapLayerPayload,
  type UnifiedMapLayerPayload,
  type UnifiedMapLeg,
  type UnifiedMapPoint,
} from '@/types/unified-map-layer';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function normalizePoint(v: unknown, index: number): UnifiedMapPoint | null {
  if (!isRecord(v)) return null;
  const lat = pickNum(v.lat) ?? pickNum(v.latitude);
  const lng = pickNum(v.lng) ?? pickNum(v.longitude);
  if (lat == null || lng == null) return null;

  const kindRaw = v.kind ?? v.type;
  const kind =
    typeof kindRaw === 'string' && kindRaw.trim() ? kindRaw.trim() : 'poi';

  return {
    kind,
    lat,
    lng,
    ...(pickStr(v.id) ? { id: pickStr(v.id) } : { id: `point-${index}` }),
    ...(pickStr(v.label_zh) ?? pickStr(v.labelZh)
      ? { label_zh: pickStr(v.label_zh) ?? pickStr(v.labelZh) }
      : {}),
    ...(pickNum(v.night_index) ?? pickNum(v.nightIndex)
      ? { night_index: pickNum(v.night_index) ?? pickNum(v.nightIndex) }
      : {}),
    ...(pickNum(v.day_index) ?? pickNum(v.dayIndex)
      ? { day_index: pickNum(v.day_index) ?? pickNum(v.dayIndex) }
      : {}),
  };
}

function normalizeCoordinates(raw: unknown): [number, number][] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const coords: [number, number][] = [];
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lng = pickNum(pair[0]);
    const lat = pickNum(pair[1]);
    if (lng != null && lat != null) coords.push([lng, lat]);
  }
  return coords.length >= 2 ? coords : undefined;
}

function normalizeLeg(v: unknown, index: number): UnifiedMapLeg | null {
  if (!isRecord(v)) return null;
  const coordinates = normalizeCoordinates(v.coordinates ?? v.path_coordinates ?? v.pathCoordinates);
  return {
    ...(pickStr(v.id) ? { id: pickStr(v.id) } : { id: `leg-${index}` }),
    ...(pickStr(v.from_point_id) ?? pickStr(v.fromPointId)
      ? { from_point_id: pickStr(v.from_point_id) ?? pickStr(v.fromPointId) }
      : {}),
    ...(pickStr(v.to_point_id) ?? pickStr(v.toPointId)
      ? { to_point_id: pickStr(v.to_point_id) ?? pickStr(v.toPointId) }
      : {}),
    ...(pickNum(v.from_index) ?? pickNum(v.fromIndex)
      ? { from_index: pickNum(v.from_index) ?? pickNum(v.fromIndex) }
      : {}),
    ...(pickNum(v.to_index) ?? pickNum(v.toIndex)
      ? { to_index: pickNum(v.to_index) ?? pickNum(v.toIndex) }
      : {}),
    ...(pickStr(v.kind) ? { kind: pickStr(v.kind) } : {}),
    ...(pickStr(v.label_zh) ?? pickStr(v.labelZh)
      ? { label_zh: pickStr(v.label_zh) ?? pickStr(v.labelZh) }
      : {}),
    ...(coordinates ? { coordinates } : {}),
  };
}

export function normalizeUnifiedMapLayer(raw: unknown): UnifiedMapLayerPayload | null {
  if (!isUnifiedMapLayerPayload(raw)) return null;

  const points = raw.points
    .map((p, idx) => normalizePoint(p, idx))
    .filter(Boolean) as UnifiedMapPoint[];

  if (!points.length) return null;

  const legsRaw = raw.legs;
  const legs = Array.isArray(legsRaw)
    ? (legsRaw.map((leg, idx) => normalizeLeg(leg, idx)).filter(Boolean) as UnifiedMapLeg[])
    : undefined;

  return {
    schema: 'tripnara.unified_map_layer@v1',
    points,
    ...(legs?.length ? { legs } : {}),
    ...(pickStr(raw.headline_zh) ? { headline_zh: pickStr(raw.headline_zh) } : {}),
    ...(pickStr(raw.summary_zh) ? { summary_zh: pickStr(raw.summary_zh) } : {}),
    ...(pickStr(raw.overview_directions_url) ?? pickStr(raw.overviewDirectionsUrl)
      ? {
          overview_directions_url:
            pickStr(raw.overview_directions_url) ?? pickStr(raw.overviewDirectionsUrl),
        }
      : {}),
  };
}

export function pickUnifiedMapLayerFromRouteRun(
  response: RouteAndRunResponse
): UnifiedMapLayerPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const uiDisplay = isRecord(payload?.ui_display) ? payload.ui_display : undefined;
  const raw = uiDisplay?.unified_map_layer ?? uiDisplay?.unifiedMapLayer;
  return normalizeUnifiedMapLayer(raw);
}

export function hasUnifiedMapLayerUi(
  layer: UnifiedMapLayerPayload | null | undefined
): boolean {
  return Boolean(layer?.points?.length);
}

/** 将 leg 解析为可绘制的折线坐标 */
export function resolveUnifiedMapLegCoordinates(
  leg: UnifiedMapLeg,
  points: UnifiedMapPoint[]
): [number, number][] | null {
  if (leg.coordinates && leg.coordinates.length >= 2) return leg.coordinates;

  const byId = new Map(points.map((p) => [p.id ?? '', p]));
  let from: UnifiedMapPoint | undefined;
  let to: UnifiedMapPoint | undefined;

  if (leg.from_point_id) from = byId.get(leg.from_point_id);
  if (leg.to_point_id) to = byId.get(leg.to_point_id);

  if (!from && leg.from_index != null && leg.from_index >= 0) {
    from = points[leg.from_index];
  }
  if (!to && leg.to_index != null && leg.to_index >= 0) {
    to = points[leg.to_index];
  }

  if (!from || !to) return null;
  return [
    [from.lng, from.lat],
    [to.lng, to.lat],
  ];
}

export const UNIFIED_MAP_POINT_STYLES: Record<
  string,
  { color: string; emoji: string; label: string }
> = {
  poi: { color: '#88C0D0', emoji: '📍', label: '行程 POI' },
  hotel_depot: { color: '#7c3aed', emoji: '🏨', label: '住宿锚点' },
  car_pickup: { color: '#059669', emoji: '🚗', label: '取车' },
  car_dropoff: { color: '#d97706', emoji: '🅿️', label: '还车' },
};

export function unifiedMapPointStyle(kind: string) {
  const k = kind.toLowerCase();
  return UNIFIED_MAP_POINT_STYLES[k] ?? {
    color: '#64748b',
    emoji: '📍',
    label: kind,
  };
}
