import { useEffect, useMemo, useState } from 'react';
import type { LngLat } from '@/lib/map-geo';
import {
  fetchMapboxDrivingRoute,
  isStraightDayAnchorLine,
} from '@/lib/mapbox-directions';
import { isMapboxConfigured } from '@/lib/mapbox-token';
import {
  isReasonableIcelandMapPoint,
  normalizeRouteMapPoint,
} from '@/features/exploration/lib/normalize-route-map-point';
import {
  deriveDayAnchorsFromRouteLine,
  type DayMapAnchor,
} from '@/features/exploration/lib/route-line-anchors.util';
import type { NormalizedRouteMap } from '../lib/route-map.util';
import { buildMainLineFromDayMapPoints, coerceLngLatLine } from '../lib/route-map.util';

export type { DayMapAnchor };

function buildDayWaypoints(
  days: Array<{ day: number; mapPoint?: { lng: number; lat: number } }>,
): LngLat[] {
  return [...days]
    .sort((a, b) => a.day - b.day)
    .map((d) => normalizeRouteMapPoint(d.mapPoint))
    .filter((p): p is { lng: number; lat: number } => Boolean(p && isReasonableIcelandMapPoint(p)))
    .map((p) => [p.lng, p.lat] as LngLat);
}

/** 仅当折线明显是 day 锚点直连、且不含后端贴路几何时，才用 Mapbox 重算主路线 */
function isSparseDayConnectorLine(
  base: LngLat[],
  dayWaypoints: LngLat[],
  normalizedDayLine: LngLat[] | undefined,
): boolean {
  if (dayWaypoints.length < 2) return false;
  return (
    base.length === dayWaypoints.length &&
    isStraightDayAnchorLine(base, normalizedDayLine ?? dayWaypoints)
  );
}

function shouldSnapMainLineWithMapbox(
  base: LngLat[],
  dayWaypoints: LngLat[],
  normalizedDayLine: LngLat[] | undefined,
): boolean {
  if (dayWaypoints.length < 2) return false;
  // 后端已贴路：折线明显比 day 锚点更密
  if (base.length > Math.max(dayWaypoints.length + 2, 8)) return false;
  if (isSparseDayConnectorLine(base, dayWaypoints, normalizedDayLine)) return true;
  // 折线点数与 day 数接近，仍尝试 Mapbox 贴主道（F 路不走 Mapbox）
  return base.length <= dayWaypoints.length + 1;
}

function deriveAnchorsForLine(
  line: LngLat[] | undefined,
  days: Array<{ day: number; mapPoint?: { lng: number; lat: number } }>,
): DayMapAnchor[] {
  const normalized = coerceLngLatLine(line);
  if (normalized?.length) {
    return deriveDayAnchorsFromRouteLine(normalized, days);
  }
  return [];
}

/** 将 day 锚点或直连折线通过 Mapbox Directions 贴路网；标记始终吸附在显示中的主折线上 */
export function useRoadSnappedRoute(
  mapData: NormalizedRouteMap | undefined,
  days: Array<{ day: number; mapPoint?: { lng: number; lat: number } }>,
): {
  mainLine: LngLat[] | undefined;
  dayAnchors: DayMapAnchor[];
  snapping: boolean;
} {
  const dayWaypoints = useMemo(() => buildDayWaypoints(days), [days]);
  const mainLineKey = useMemo(
    () => JSON.stringify(mapData?.mainLine ?? null),
    [mapData?.mainLine],
  );

  const [mainLine, setMainLine] = useState<LngLat[] | undefined>(() =>
    coerceLngLatLine(mapData?.mainLine),
  );
  const [snappedAnchors, setSnappedAnchors] = useState<DayMapAnchor[]>(() =>
    deriveAnchorsForLine(mapData?.mainLine, days),
  );
  const [snapping, setSnapping] = useState(false);

  useEffect(() => {
    const base = coerceLngLatLine(mapData?.mainLine);
    if (!base?.length) {
      setMainLine(undefined);
      setSnappedAnchors([]);
      setSnapping(false);
      return;
    }

    const normalizedDayLine = buildMainLineFromDayMapPoints(days);
    const applyLine = (line: LngLat[] | undefined) => {
      const normalized = coerceLngLatLine(line) ?? base;
      setMainLine(normalized);
      setSnappedAnchors(deriveAnchorsForLine(normalized, days));
    };

    if (!shouldSnapMainLineWithMapbox(base, dayWaypoints, normalizedDayLine)) {
      applyLine(base);
      setSnapping(false);
      return;
    }

    const snapWaypoints = dayWaypoints.length >= 2 ? dayWaypoints : base;
    if (snapWaypoints.length < 2 || !isMapboxConfigured()) {
      applyLine(base);
      setSnapping(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setSnapping(true);

    void fetchMapboxDrivingRoute(snapWaypoints, { signal: controller.signal }).then((result) => {
      if (cancelled) return;
      applyLine(coerceLngLatLine(result?.line) ?? base);
      setSnapping(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mainLineKey, days, dayWaypoints, mapData?.mainLine]);

  return { mainLine, dayAnchors: snappedAnchors, snapping };
}
