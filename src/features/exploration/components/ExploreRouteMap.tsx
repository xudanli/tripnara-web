import { useMemo } from 'react';
import { MapboxTrailMap } from '@/components/map/MapboxTrailMap';
import { getRouteMapData } from '@/features/exploration/data/iceland-route-maps';
import { useRoadSnappedRoute } from '@/features/exploration/hooks/useRoadSnappedRoute';
import { createExploreDayMarkerElement } from '@/features/exploration/lib/explore-day-marker.util';
import { EXPLORE_ROUTE_MAP } from '@/features/exploration/lib/explore-route-map-tokens';
import {
  resolveRouteMapForDisplay,
  coerceLngLatLine,
  getRouteMapLayers,
  type NormalizedRouteMap,
} from '@/features/exploration/lib/route-map.util';
import type { RouteCandidateMock } from '@/features/exploration/types';
import { cn } from '@/lib/utils';

type RouteDay = RouteCandidateMock['detail']['days'][number];

const EMPTY_ROUTE_DAYS: RouteDay[] = [];

interface ExploreRouteMapProps {
  routeId: string;
  days?: RouteDay[];
  map?: NormalizedRouteMap;
  selectedDay?: number | null;
  onDaySelect?: (day: number) => void;
  className?: string;
  showLegend?: boolean;
  showDayMarkers?: boolean;
  /** 默认 true；Compare 页传 false 避免回退 iceland mock 折线 */
  useMockFallback?: boolean;
}

export function ExploreRouteMap({
  routeId,
  days = EMPTY_ROUTE_DAYS,
  map,
  selectedDay = null,
  onDaySelect,
  className,
  showLegend = true,
  showDayMarkers = true,
  useMockFallback = true,
}: ExploreRouteMapProps) {
  const fallback = useMockFallback ? getRouteMapData(routeId) : undefined;
  const mapData = useMemo(
    () =>
      resolveRouteMapForDisplay({
        days: showDayMarkers ? days : undefined,
        map,
        fallbackMainLine: fallback?.mainLine,
        fallbackFRoadLine: fallback?.fRoadLine,
      }),
    [days, map, fallback, showDayMarkers],
  );

  const { mainLine: snappedMainLine, dayAnchors, snapping } = useRoadSnappedRoute(
    mapData,
    days,
  );

  const anchorByDay = useMemo(
    () => new Map(dayAnchors.map((a) => [a.day, a])),
    [dayAnchors],
  );

  const markers = useMemo(
    () =>
      showDayMarkers
        ? days
            .filter((d) => anchorByDay.has(d.day))
            .map((d) => {
              const anchor = anchorByDay.get(d.day)!;
              return {
                id: `day-${d.day}`,
                lng: anchor.lng,
                lat: anchor.lat,
                label: `D${d.day} ${d.theme}`,
                element: createExploreDayMarkerElement({
                  day: d.day,
                  theme: d.theme,
                  experience: d.experience,
                  route: d.route,
                  stay: d.stay,
                  highlight: d.highlight,
                  selected: selectedDay === d.day,
                }),
              };
            })
        : [],
    [days, selectedDay, showDayMarkers, anchorByDay],
  );

  const routeLayers = useMemo(() => (mapData ? getRouteMapLayers(mapData) : []), [mapData]);
  const fRoadLayer = useMemo(
    () =>
      routeLayers.find((layer) => layer.id === 'fRoad' || layer.lineStyle === 'dashed'),
    [routeLayers],
  );
  const mainLayer = useMemo(
    () => routeLayers.find((layer) => layer.id === 'main' || layer.lineStyle === 'solid'),
    [routeLayers],
  );

  const displayMainLine =
    coerceLngLatLine(snappedMainLine) ??
    coerceLngLatLine(mapData?.mainLine) ??
    mainLayer?.coordinates;
  const fRoadCoordinates = fRoadLayer?.coordinates ?? mapData?.fRoadLine;

  const hasRenderableGeometry = Boolean(
    displayMainLine?.length ||
      fRoadCoordinates?.length ||
      routeLayers.some((layer) => layer.coordinates.length >= 2),
  );

  if (!hasRenderableGeometry) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
      >
        暂无路线地图数据
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-2xl border border-border overflow-hidden', className)}>
      {snapping ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-border/80 bg-card/90 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
          正在贴合路网…
        </div>
      ) : null}
      <MapboxTrailMap
        className="h-full w-full min-h-[256px]"
        height="100%"
        lineCoordinates={displayMainLine}
        recordedLineCoordinates={fRoadCoordinates}
        markers={markers}
        mapStyle={EXPLORE_ROUTE_MAP.mapStyle}
        lineColor={EXPLORE_ROUTE_MAP.mainLineColor}
        recordedLineColor={EXPLORE_ROUTE_MAP.fRoadLineColor}
        lineWidth={EXPLORE_ROUTE_MAP.mainLineWidth}
        fitBounds
        onMarkerClick={(id) => {
          const day = Number(id.replace('day-', ''));
          if (Number.isFinite(day)) onDaySelect?.(day);
        }}
      />
      {showLegend && (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-border/80 bg-card/95 px-3 py-2.5 text-[10px] text-foreground shadow-sm backdrop-blur-sm space-y-1.5">
          {routeLayers.map((layer) => (
            <p
              key={layer.id}
              className={cn(
                'flex items-center gap-2',
                layer.id !== 'main' && 'text-muted-foreground',
              )}
            >
              {layer.lineStyle === 'dashed' ? (
                <span
                  className="inline-block w-5 shrink-0 border-t-[2px] border-dashed align-middle"
                  style={{ borderColor: EXPLORE_ROUTE_MAP.fRoadLineColor }}
                />
              ) : (
                <span
                  className="inline-block h-[3px] w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: EXPLORE_ROUTE_MAP.mainLineColor }}
                />
              )}
              {layer.label ?? (layer.id === 'fRoad' ? 'F 路' : '主路线')}
              {layer.requires4wd ? ' · 需四驱' : ''}
            </p>
          ))}
          {showDayMarkers ? (
            <p className="text-muted-foreground pt-0.5 border-t border-border/50">
              点击 D 标记查看当日活动
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
