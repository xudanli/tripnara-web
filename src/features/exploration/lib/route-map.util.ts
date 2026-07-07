import type {
  RouteLineCoordinates,
  RouteMapGeometry,
  RouteMapLayerView,
  RouteMapLineStyle,
} from '../api/types';
import type { LngLat } from '@/lib/map-geo';
import { mapPointToLngLat } from './normalize-route-map-point';

export interface RouteMapLayer {
  id: string;
  lineStyle: RouteMapLineStyle;
  coordinates: LngLat[];
  label?: string;
  requires4wd?: boolean;
}

export interface NormalizedRouteMap {
  mainLine: LngLat[];
  fRoadLine?: LngLat[];
  layers?: RouteMapLayer[];
}

const LAYER_COORDINATE_KEYS: Record<string, 'mainLine' | 'fRoadLine'> = {
  main: 'mainLine',
  fRoad: 'fRoadLine',
};

function resolveLayerCoordinates(
  layer: RouteMapLayerView,
  lines: { mainLine?: LngLat[]; fRoadLine?: LngLat[] },
): LngLat[] | undefined {
  const inline = normalizeRouteLineCoordinates(layer.coordinates);
  if (inline?.length) return inline;

  const key = LAYER_COORDINATE_KEYS[layer.id];
  if (key && lines[key]?.length) return lines[key];

  return undefined;
}

function extractLineFromLayers(
  layers: RouteMapLayerView[] | undefined,
  id: string,
): LngLat[] | undefined {
  const layer = layers?.find((entry) => entry.id === id);
  if (!layer) return undefined;
  return normalizeRouteLineCoordinates(layer.coordinates);
}

function extractRouteMapLines(map: RouteMapGeometry): {
  mainLine?: LngLat[];
  fRoadLine?: LngLat[];
} {
  const mainLine =
    normalizeRouteLineCoordinates(map.mainLine) ??
    extractLineFromLayers(map.layers, 'main');
  const fRoadLine =
    normalizeRouteLineCoordinates(map.fRoadLine) ??
    extractLineFromLayers(map.layers, 'fRoad');
  return { mainLine, fRoadLine };
}

/** 优先使用 API layers 元数据，否则 fallback 到 mainLine / fRoadLine */
export function getRouteMapLayers(
  map?: RouteMapGeometry | NormalizedRouteMap | null,
): RouteMapLayer[] {
  if (!map) return [];

  const extracted =
    'mainLine' in map && Array.isArray(map.mainLine)
      ? {
          mainLine: normalizeRouteLineCoordinates(map.mainLine),
          fRoadLine: normalizeRouteLineCoordinates(map.fRoadLine),
        }
      : extractRouteMapLines(map as RouteMapGeometry);

  let mainLine = extracted.mainLine;
  let fRoadLine = extracted.fRoadLine;

  if (!mainLine?.length && 'layers' in map && map.layers?.length) {
    mainLine = extractLineFromLayers(map.layers, 'main');
    fRoadLine = fRoadLine ?? extractLineFromLayers(map.layers, 'fRoad');
  }

  if (!mainLine?.length) return [];

  const lines = { mainLine, fRoadLine };

  const apiLayers = 'layers' in map ? map.layers : undefined;
  if (apiLayers?.length) {
    const resolved = apiLayers.flatMap((layer) => {
      const coordinates = resolveLayerCoordinates(layer, lines);
      if (!coordinates || coordinates.length < 2) return [];
      return [
        {
          id: layer.id,
          lineStyle: layer.lineStyle ?? (layer.id === 'fRoad' ? 'dashed' : 'solid'),
          coordinates,
          label: layer.label,
          requires4wd: layer.requires4wd,
        },
      ];
    });
    if (resolved.length) return resolved;
  }

  const fallback: RouteMapLayer[] = [
    { id: 'main', lineStyle: 'solid', coordinates: mainLine, label: '主路线' },
  ];
  if (fRoadLine?.length) {
    fallback.push({
      id: 'fRoad',
      lineStyle: 'dashed',
      coordinates: fRoadLine,
      label: 'F 路',
      requires4wd: true,
    });
  }
  return fallback;
}

export function normalizeRouteLineCoordinates(input?: RouteLineCoordinates): LngLat[] | undefined {
  return coerceLngLatLine(input);
}

/** 保证折线为 [lng, lat][]，兼容 GeoJSON、误传的 Directions 结果等 */
export function coerceLngLatLine(input: unknown): LngLat[] | undefined {
  if (!input) return undefined;

  if (Array.isArray(input)) {
    const line = input.filter(isLngLatPair);
    return line.length >= 2 ? line : undefined;
  }

  if (typeof input === 'object') {
    const obj = input as {
      line?: unknown;
      coordinates?: unknown;
      type?: string;
    };

    if (obj.line != null) return coerceLngLatLine(obj.line);
    if (obj.type === 'LineString' && obj.coordinates != null) {
      return coerceLngLatLine(obj.coordinates);
    }
    if (obj.coordinates != null) return coerceLngLatLine(obj.coordinates);
  }

  return undefined;
}

function isLngLatPair(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

export function normalizeRouteMap(map?: RouteMapGeometry): NormalizedRouteMap | undefined {
  if (!map) return undefined;
  const { mainLine, fRoadLine } = extractRouteMapLines(map);
  if (!mainLine?.length) return undefined;
  const base: NormalizedRouteMap = fRoadLine?.length ? { mainLine, fRoadLine } : { mainLine };
  const layers = getRouteMapLayers({ ...map, ...base });
  return layers.length ? { ...base, layers } : base;
}

/** 按 day 序号连接 mapPoint，保证折线与 D1→D2→… 标记一致 */
export function buildMainLineFromDayMapPoints(
  days: Array<{ day: number; mapPoint?: { lng: number; lat: number } }>,
): LngLat[] | undefined {
  const points = [...days]
    .sort((a, b) => a.day - b.day)
    .map((d) => mapPointToLngLat(d.mapPoint))
    .filter((p): p is LngLat => p != null);
  return points.length >= 2 ? points : undefined;
}

/** F 路虚线：串联含 F 路 tip 或 highlight 的 day 锚点 */
export function buildFRoadLineFromDays(
  days: Array<{
    day: number;
    mapPoint?: { lng: number; lat: number };
    tip?: string;
    highlight?: boolean;
  }>,
): LngLat[] | undefined {
  const points = [...days]
    .filter(
      (d): d is { day: number; mapPoint: { lng: number; lat: number }; tip?: string; highlight?: boolean } =>
        Boolean(d.mapPoint) && (Boolean(d.highlight) || d.tip?.includes('F') === true),
    )
    .sort((a, b) => a.day - b.day)
    .map((d) => mapPointToLngLat(d.mapPoint))
    .filter((p): p is LngLat => p != null);
  return points.length >= 2 ? points : undefined;
}

export function resolveRouteMapForDisplay(options: {
  days?: Array<{
    day: number;
    mapPoint?: { lng: number; lat: number };
    tip?: string;
    highlight?: boolean;
  }>;
  map?: NormalizedRouteMap;
  /** 无 days 时回退 mock 折线 */
  fallbackMainLine?: LngLat[];
  fallbackFRoadLine?: LngLat[];
}): NormalizedRouteMap | undefined {
  const dayMain = options.days?.length ? buildMainLineFromDayMapPoints(options.days) : undefined;

  const fromMap =
    options.map?.mainLine?.length || options.map?.layers?.length ? options.map : undefined;
  const fromFallback =
    options.fallbackMainLine?.length && options.fallbackMainLine.length >= 2
      ? {
          mainLine: options.fallbackMainLine,
          fRoadLine: options.fallbackFRoadLine,
        }
      : undefined;

  const geometry = fromMap ?? fromFallback;
  const mainLine = geometry?.mainLine ?? dayMain;
  if (!mainLine) return undefined;

  const fRoadLine =
    geometry?.fRoadLine ??
    options.map?.fRoadLine ??
    buildFRoadLineFromDays(options.days ?? []) ??
    options.fallbackFRoadLine;

  const base: NormalizedRouteMap = fRoadLine ? { mainLine, fRoadLine } : { mainLine };
  const layers = getRouteMapLayers(base);
  return layers.length ? { ...base, layers } : base;
}

/** 后端 routeId / strategyId → mock 查找键 */
export function resolveRouteLookupKey(routeIdOrStrategyId: string): string {
  const id = routeIdOrStrategyId.trim();
  const strategyAliases: Record<string, string> = {
    'remote-highlands-south': 'highland-south',
    'south-depth': 'south-depth',
    'ring-compressed': 'ring-compressed',
  };
  const withoutPrefix = id.replace(/^route[_-]/, '').replace(/^route_/, '');
  return strategyAliases[withoutPrefix] ?? strategyAliases[id] ?? id;
}
