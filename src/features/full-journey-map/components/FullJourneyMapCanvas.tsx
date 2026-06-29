import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken } from '@/lib/mapbox-token';
import {
  createMapMarkerElement,
  createRiskMarkerElement,
  resolveMarkerVisual,
} from '../lib/journey-map-marker-icons';
import { buildJourneyMapPopupHtml } from '../lib/journey-map-popup.util';
import {
  createDayLabelElement,
  createRouteLabelElement,
  lineCoordinates,
  polylineMidpoint,
} from '../lib/journey-map-route.util';
import {
  journeyMapLegend,
  journeyMapLegendTitle,
  journeyMapBaseStyle,
} from '../journey-map-ui';
import { buildRouteSegmentsFromDays } from '../lib/build-journey-map-model';
import type {
  JourneyActivity,
  JourneyDay,
  JourneyDiversion,
  JourneyLayerKind,
  JourneyMapModel,
  JourneyRiskPoint,
  MemberGroupId,
} from '../types';

export interface FullJourneyMapCanvasProps {
  model: JourneyMapModel;
  selectedDayIndex: number;
  selectedActivityId: string | null;
  activeLayers: Set<JourneyLayerKind | 'all'>;
  memberFilter: MemberGroupId;
  onSelectActivity: (activity: JourneyActivity) => void;
  className?: string;
}

function layerVisible(
  kind: JourneyLayerKind,
  activeLayers: Set<JourneyLayerKind | 'all'>,
): boolean {
  if (activeLayers.has('all')) return true;
  if (kind === 'diversion') return activeLayers.has('diversion');
  if (kind === 'accommodation') return activeLayers.has('accommodation');
  if (kind === 'transport') return activeLayers.has('transport');
  if (kind === 'activity' || kind === 'meeting') return activeLayers.has('activity');
  return true;
}

function memberMatches(
  activity: JourneyActivity,
  filter: MemberGroupId,
  members: JourneyMapModel['members'],
): boolean {
  if (filter === 'all') return true;
  const groupMemberIds = members.filter((m) => m.groupId === filter).map((m) => m.id);
  if (groupMemberIds.length === 0) return false;
  return activity.participantIds.some((id) => groupMemberIds.includes(id));
}

function createMarkerElement(
  activity: JourneyActivity,
  opts: { selected: boolean; dimmed: boolean; onClick: () => void },
): HTMLElement {
  return createMapMarkerElement(activity, opts);
}

function createRiskElement(
  risk: JourneyRiskPoint,
  opts: { onClick: () => void },
): HTMLElement {
  return createRiskMarkerElement(risk, opts);
}

export function FullJourneyMapCanvas({
  model,
  selectedDayIndex,
  selectedActivityId,
  activeLayers,
  memberFilter,
  onSelectActivity,
  className,
}: FullJourneyMapCanvasProps) {
  const token = getMapboxAccessToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLabelMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [ready, setReady] = useState(false);

  const routeSegments = useMemo(
    () =>
      model.routeSegments?.length
        ? model.routeSegments
        : buildRouteSegmentsFromDays(model.days),
    [model.routeSegments, model.days],
  );

  const visibleActivities = useMemo(() => {
    return model.activities.filter((a) => {
      if (!layerVisible(a.kind, activeLayers)) return false;
      return memberMatches(a, memberFilter, model.members);
    });
  }, [model.activities, model.members, activeLayers, memberFilter]);

  const dimmedActivityIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of model.activities) {
      const dayMatch = a.dayIndex === selectedDayIndex;
      const layerOk = layerVisible(a.kind, activeLayers);
      const memberOk = memberMatches(a, memberFilter, model.members);
      if (!dayMatch && layerOk && memberOk) set.add(a.id);
    }
    return set;
  }, [model.activities, model.members, selectedDayIndex, activeLayers, memberFilter]);

  const flyToDay = useCallback(
    (day: JourneyDay) => {
      const map = mapRef.current;
      if (!map) return;
      if (day.routeCoordinates.length >= 2) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const c of day.routeCoordinates) bounds.extend(c);
        map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 900 });
        return;
      }
      const act = model.activities.find((a) => a.dayIndex === day.dayIndex);
      if (act) {
        map.flyTo({ center: [act.lng, act.lat], zoom: 10, duration: 900 });
      }
    },
    [model.activities],
  );

  const fitModelBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;
    for (const seg of routeSegments) {
      for (const c of seg.coordinates) {
        bounds.extend(c);
        hasPoint = true;
      }
    }
    for (const day of model.days) {
      for (const c of day.routeCoordinates) {
        bounds.extend(c);
        hasPoint = true;
      }
    }
    for (const a of model.activities) {
      bounds.extend([a.lng, a.lat]);
      hasPoint = true;
    }
    if (hasPoint && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: 0 });
    } else {
      map.flyTo({ center: model.mapCenter, zoom: model.mapZoom, duration: 0 });
    }
  }, [model.days, model.activities, routeSegments, model.mapCenter, model.mapZoom]);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    const container = containerRef.current;
    let map: mapboxgl.Map | null = null;
    let cancelled = false;

    const ensureMap = () => {
      if (cancelled || mapRef.current || !container) return;
      if (container.clientWidth < 2 || container.clientHeight < 2) return;

      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container,
        style: journeyMapBaseStyle,
        center: model.mapCenter,
        zoom: model.mapZoom,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
      map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100 }), 'bottom-left');
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      mapRef.current = map;

      map.on('error', (e) => {
        if (e.error?.message?.includes('aborted') || e.error?.name === 'AbortError') return;
        console.warn('[FullJourneyMapCanvas]', e.error);
      });

      map.on('load', () => {
        if (cancelled || !map) return;
        setReady(true);
        requestAnimationFrame(() => {
          map?.resize();
          window.setTimeout(() => map?.resize(), 120);
        });
      });
    };

    ensureMap();

    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        return;
      }
      ensureMap();
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [token]);

  useEffect(() => {
    if (!ready) return;
    fitModelBounds();
  }, [ready, model.id, fitModelBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    routeLabelMarkersRef.current.forEach((m) => m.remove());
    routeLabelMarkersRef.current = [];
    removeJourneyRouteLayers(map);

    const activeDiversion = model.diversions.find((d) => d.dayIndex === selectedDayIndex);
    const trunkSegmentIds =
      activeDiversion?.trunkSegmentIds?.length && activeDiversion.trunkSegmentIds.length > 0
        ? new Set(activeDiversion.trunkSegmentIds)
        : null;

    for (const seg of routeSegments) {
      const isSelectedDay = seg.dayIndex === selectedDayIndex;
      if (trunkSegmentIds && isSelectedDay && !trunkSegmentIds.has(seg.id)) {
        continue;
      }

      addRouteLine(map, {
        id: `seg-${seg.id}`,
        coordinates: seg.coordinates,
        color: seg.color,
        width: isSelectedDay ? 5 : 4,
        opacity: isSelectedDay ? 1 : 0.42,
      });
    }

    for (const day of model.days) {
      if (day.routeCoordinates.length < 2) continue;
      const mid = polylineMidpoint(day.routeCoordinates);
      if (!mid) continue;
      const isSelected = day.dayIndex === selectedDayIndex;
      const el = createDayLabelElement(`Day ${day.dayIndex + 1}`, {
        backgroundColor: day.color,
        selected: isSelected,
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(mid)
        .addTo(map);
      routeLabelMarkersRef.current.push(marker);
    }

    if (activeDiversion) {
      syncDiversionRoutes(map, activeDiversion, model.activities, routeLabelMarkersRef);
    }

    return () => {
      routeLabelMarkersRef.current.forEach((m) => m.remove());
      routeLabelMarkersRef.current = [];
      removeJourneyRouteLayers(map);
    };
  }, [routeSegments, model.diversions, model.activities, model.days, selectedDayIndex, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupRef.current?.remove();
    popupRef.current = null;

    const showPopup = (activity: JourneyActivity) => {
      popupRef.current?.remove();
      const visual = resolveMarkerVisual(activity);
      const html = buildJourneyMapPopupHtml(activity, visual, model.members);
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 16,
        className: 'journey-map-popup',
      })
        .setLngLat([activity.lng, activity.lat])
        .setHTML(html)
        .addTo(map);

      popupRef.current = popup;
      popup.getElement()?.querySelector('[data-action="details"]')?.addEventListener('click', () => {
        onSelectActivity(activity);
      });
    };

    for (const activity of visibleActivities) {
      const el = createMarkerElement(activity, {
        selected: activity.id === selectedActivityId,
        dimmed: dimmedActivityIds.has(activity.id),
        onClick: () => {
          onSelectActivity(activity);
          showPopup(activity);
        },
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([activity.lng, activity.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    for (const risk of model.riskPoints) {
      if (risk.dayIndex !== selectedDayIndex) continue;
      const el = createRiskElement(risk, {
        onClick: () => {
          const pseudo: JourneyActivity = {
            id: risk.id,
            dayIndex: risk.dayIndex,
            title: risk.title,
            kind: 'risk',
            lng: risk.lng,
            lat: risk.lat,
            summary: risk.description,
            participantIds: [],
          };
          onSelectActivity(pseudo);
        },
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([risk.lng, risk.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [
    visibleActivities,
    dimmedActivityIds,
    selectedActivityId,
    model.riskPoints,
    model.members,
    selectedDayIndex,
    onSelectActivity,
    ready,
  ]);

  useEffect(() => {
    if (!ready) return;
    const day = model.days.find((d) => d.dayIndex === selectedDayIndex);
    if (day) flyToDay(day);
  }, [ready, selectedDayIndex, model.days, flyToDay]);

  if (!token) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground',
          className,
        )}
      >
        请配置 VITE_MAPBOX_ACCESS_TOKEN 以显示地图
      </div>
    );
  }

  return (
    <div className={cn('relative flex h-full min-h-[280px] w-full flex-1 flex-col', className)}>
      <div
        ref={containerRef}
        className="h-full min-h-0 w-full flex-1"
        role="application"
        aria-label="全程地图"
      />
      {!ready ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
          <p className="text-xs text-muted-foreground">地图加载中…</p>
        </div>
      ) : null}

      {/* 图例 · 按天分色 */}
      <div className={journeyMapLegend}>
        <p className={journeyMapLegendTitle}>图例</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          {model.days.map((day) => (
            <div key={day.id} className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: day.color }}
                aria-hidden
              />
              <span
                className={
                  day.dayIndex === selectedDayIndex ? 'font-medium text-foreground' : undefined
                }
              >
                Day {day.dayIndex + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeDiversionActivityId(activityId: string): string {
  if (activityId.startsWith('item-') || activityId.startsWith('poi-')) {
    return activityId;
  }
  return `item-${activityId}`;
}

function removeJourneyRouteLayers(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style) return;

  for (const layer of [...(style.layers ?? [])]) {
    if (layer.id.startsWith('journey-route-') && map.getLayer(layer.id)) {
      map.removeLayer(layer.id);
    }
  }
  for (const sourceId of Object.keys(style.sources ?? {})) {
    if (sourceId.startsWith('journey-route-') && map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }
}

function addRouteLine(
  map: mapboxgl.Map,
  opts: {
    id: string;
    coordinates: [number, number][];
    color: string;
    width: number;
    opacity: number;
    dashed?: boolean;
  },
) {
  if (opts.coordinates.length < 2) return;

  const sourceId = `journey-route-${opts.id}`;
  const layerId = `${sourceId}-line`;

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: opts.coordinates },
    },
  });

  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': opts.color,
      'line-width': opts.width,
      'line-opacity': opts.opacity,
      ...(opts.dashed ? { 'line-dasharray': [4, 2] as [number, number] } : {}),
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });
}

function addRouteLabel(
  map: mapboxgl.Map,
  label: string,
  coordinates: [number, number],
  markersRef: MutableRefObject<mapboxgl.Marker[]>,
  opts?: { accentColor?: string; variant?: 'branch' | 'merge' },
) {
  const el = createRouteLabelElement(label, opts);
  const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
    .setLngLat(coordinates)
    .addTo(map);
  markersRef.current.push(marker);
}

function syncDiversionRoutes(
  map: mapboxgl.Map,
  diversion: JourneyDiversion,
  activities: JourneyActivity[],
  labelMarkersRef: MutableRefObject<mapboxgl.Marker[]>,
) {
  const actA = activities.find((a) => a.id === normalizeDiversionActivityId(diversion.groupA.activityId));
  const actB = activities.find((a) => a.id === normalizeDiversionActivityId(diversion.groupB.activityId));
  if (!actA || !actB) return;

  const pointA: [number, number] = [actA.lng, actA.lat];
  const pointB: [number, number] = [actB.lng, actB.lat];

  const branchA = lineCoordinates(diversion.splitCoordinates, pointA, diversion.groupA.polyline);
  const branchB = lineCoordinates(diversion.splitCoordinates, pointB, diversion.groupB.polyline);

  addRouteLine(map, {
    id: `div-${diversion.id}-a`,
    coordinates: branchA,
    color: diversion.groupA.color,
    width: 4,
    opacity: 0.92,
  });
  addRouteLine(map, {
    id: `div-${diversion.id}-b`,
    coordinates: branchB,
    color: diversion.groupB.color,
    width: 4,
    opacity: 0.92,
    dashed: true,
  });

  const midA = polylineMidpoint(branchA);
  const midB = polylineMidpoint(branchB);
  if (midA) {
    addRouteLabel(map, diversion.groupA.label, midA, labelMarkersRef, {
      accentColor: diversion.groupA.color,
    });
  }
  if (midB) {
    addRouteLabel(map, diversion.groupB.label, midB, labelMarkersRef, {
      accentColor: diversion.groupB.color,
    });
  }

  if (!diversion.merge) return;

  const mergePoint = diversion.merge.coordinates;
  const mergeA = lineCoordinates(pointA, mergePoint, diversion.merge.polylineA);
  const mergeB = lineCoordinates(pointB, mergePoint, diversion.merge.polylineB);

  addRouteLine(map, {
    id: `div-${diversion.id}-merge-a`,
    coordinates: mergeA,
    color: diversion.groupA.color,
    width: 3,
    opacity: 0.7,
  });
  addRouteLine(map, {
    id: `div-${diversion.id}-merge-b`,
    coordinates: mergeB,
    color: diversion.groupB.color,
    width: 3,
    opacity: 0.7,
    dashed: true,
  });

  addRouteLabel(map, diversion.merge.label, mergePoint, labelMarkersRef, { variant: 'merge' });
}
