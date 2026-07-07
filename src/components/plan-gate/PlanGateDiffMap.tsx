import { useEffect, useId, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken, isMapboxConfigured } from '@/lib/mapbox-token';
import type { PlanGateMapGeoJson } from '@/types/plan-gate';

const DEFAULT_LAYER_COLORS: Record<string, string> = {
  baseline_route: '#9CA3AF',
  draft_route: '#7C3AED',
  removed_route: '#EF4444',
  accommodation: '#F59E0B',
};

const LINE_ROLES = ['baseline_route', 'draft_route', 'removed_route'] as const;

function readFeatureRole(feature: GeoJSON.Feature): string {
  const props = feature.properties ?? {};
  return (
    (typeof props.role === 'string' && props.role) ||
    (typeof props.layerType === 'string' && props.layerType) ||
    (typeof props.type === 'string' && props.type) ||
    'draft_route'
  );
}

function resolveLegend(mapGeoJson: PlanGateMapGeoJson) {
  if (mapGeoJson.legend?.length) return mapGeoJson.legend;

  const roles = new Set(mapGeoJson.features.map(readFeatureRole));
  return Array.from(roles)
    .map((key) => ({
      key,
      label:
        key === 'baseline_route'
          ? '原路线'
          : key === 'draft_route'
            ? '新路线'
            : key === 'removed_route'
              ? '删除路段'
              : key === 'accommodation'
                ? '住宿点'
                : key,
      color: DEFAULT_LAYER_COLORS[key] ?? '#7C3AED',
    }))
    .filter((item) => DEFAULT_LAYER_COLORS[item.key] != null || item.key === 'accommodation');
}

export interface PlanGateDiffMapProps {
  mapGeoJson: PlanGateMapGeoJson;
  className?: string;
  height?: number | string;
}

export function PlanGateDiffMap({
  mapGeoJson,
  className,
  height = 280,
}: PlanGateDiffMapProps) {
  const token = getMapboxAccessToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const instanceId = useId().replace(/:/g, '');
  const sourceId = `plan-gate-diff-${instanceId}`;
  const [ready, setReady] = useState(false);
  const legend = resolveLegend(mapGeoJson);

  useEffect(() => {
    if (!token || !containerRef.current || !isMapboxConfigured()) return;

    mapboxgl.accessToken = token;

    const mb = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 4,
      attributionControl: false,
    });

    mb.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mb.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = mb;

    mb.on('load', () => setReady(true));

    return () => {
      mb.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [token]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    for (const role of LINE_ROLES) {
      const lineLayerId = `${sourceId}-line-${role}`;
      if (mb.getLayer(lineLayerId)) mb.removeLayer(lineLayerId);
    }
    const pointLayerId = `${sourceId}-points`;
    if (mb.getLayer(pointLayerId)) mb.removeLayer(pointLayerId);
    if (mb.getSource(sourceId)) mb.removeSource(sourceId);

    mb.addSource(sourceId, {
      type: 'geojson',
      data: mapGeoJson,
    });

    for (const role of LINE_ROLES) {
      const color =
        mapGeoJson.legend?.find((item) => item.key === role)?.color ??
        DEFAULT_LAYER_COLORS[role];
      mb.addLayer({
        id: `${sourceId}-line-${role}`,
        type: 'line',
        source: sourceId,
        filter: [
          'all',
          ['==', ['geometry-type'], 'LineString'],
          [
            'any',
            ['==', ['get', 'role'], role],
            ['==', ['get', 'layerType'], role],
            ['==', ['get', 'type'], role],
          ],
        ],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], color],
          'line-width': role === 'draft_route' ? 5 : role === 'removed_route' ? 4 : 3,
          'line-opacity': role === 'baseline_route' ? 0.75 : 0.9,
          ...(role === 'removed_route' ? { 'line-dasharray': [2, 2] } : {}),
        },
      });
    }

    const accommodationColor =
      mapGeoJson.legend?.find((item) => item.key === 'accommodation')?.color ??
      DEFAULT_LAYER_COLORS.accommodation;

    mb.addLayer({
      id: pointLayerId,
      type: 'circle',
      source: sourceId,
      filter: [
        'any',
        ['==', ['geometry-type'], 'Point'],
        ['==', ['get', 'role'], 'accommodation'],
        ['==', ['get', 'layerType'], 'accommodation'],
      ],
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], accommodationColor],
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    if (mapGeoJson.bounds) {
      const [west, south, east, north] = mapGeoJson.bounds;
      mb.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 40, duration: 0, maxZoom: 12 },
      );
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const feature of mapGeoJson.features) {
      if (feature.geometry.type === 'LineString') {
        for (const coord of feature.geometry.coordinates) {
          bounds.extend(coord as [number, number]);
        }
      } else if (feature.geometry.type === 'Point') {
        bounds.extend(feature.geometry.coordinates as [number, number]);
      }
    }
    if (!bounds.isEmpty()) {
      mb.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 12 });
    }
  }, [mapGeoJson, ready, sourceId]);

  if (!isMapboxConfigured()) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        地图未配置（需 VITE_MAPBOX_ACCESS_TOKEN）
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border/60', className)}>
      <div ref={containerRef} style={{ height }} className="w-full" />
      {legend.length > 0 ? (
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-md border border-border/60 bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
          {legend.map((item) => (
            <span key={item.key} className="flex items-center gap-1 text-[10px] text-foreground">
              <span
                className="inline-block h-2 w-4 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
