/**
 * route_and_run：ui_display.unified_map_layer — 多图层行程地图
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken } from '@/lib/mapbox-token';
import {
  resolveUnifiedMapLegCoordinates,
  unifiedMapPointStyle,
  UNIFIED_MAP_POINT_STYLES,
} from '@/lib/unified-map-layer-ui';
import type { UnifiedMapLayerPayload } from '@/types/unified-map-layer';
import { ExternalLink, MapPin } from 'lucide-react';

export interface UnifiedMapLayerPanelProps {
  layer: UnifiedMapLayerPayload;
  className?: string;
}

const LEG_LINE_COLOR = '#94a3b8';

export function UnifiedMapLayerPanel({ layer, className }: UnifiedMapLayerPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const token = getMapboxAccessToken();

  const legLayers = useMemo(() => {
    const legs = layer.legs ?? [];
    return legs
      .map((leg, idx) => {
        const coordinates = resolveUnifiedMapLegCoordinates(leg, layer.points);
        if (!coordinates) return null;
        return { id: leg.id ?? `leg-${idx}`, coordinates, label: leg.label_zh };
      })
      .filter(Boolean) as Array<{ id: string; coordinates: [number, number][]; label?: string }>;
  }, [layer.legs, layer.points]);

  const pointsByKind = useMemo(() => {
    const groups = new Map<string, number>();
    for (const p of layer.points) {
      const k = String(p.kind).toLowerCase();
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    return groups;
  }, [layer.points]);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const first = layer.points[0];
    const mb = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [first.lng, first.lat],
      zoom: 8,
      attributionControl: false,
    });
    mb.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mb.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = mb;

    mb.on('load', () => setReady(true));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mb.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [token, layer.points]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const point of layer.points) {
      const style = unifiedMapPointStyle(String(point.kind));
      const el = document.createElement('div');
      el.className =
        'flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md text-sm leading-none cursor-default';
      el.style.backgroundColor = style.color;
      el.textContent = style.emoji;
      const labelParts = [point.label_zh, style.label];
      if (point.night_index != null) labelParts.push(`第 ${point.night_index} 晚`);
      el.title = labelParts.filter(Boolean).join(' · ');

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(mb);
      markersRef.current.push(marker);
    }

    const existingLegIds = legLayers.map((l) => l.id);
    for (const lid of existingLegIds) {
      const layerId = `unified-leg-${lid}`;
      const sourceId = `unified-leg-src-${lid}`;
      if (mb.getLayer(layerId)) mb.removeLayer(layerId);
      if (mb.getSource(sourceId)) mb.removeSource(sourceId);
    }

    for (const leg of legLayers) {
      const sourceId = `unified-leg-src-${leg.id}`;
      const layerId = `unified-leg-${leg.id}`;
      mb.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: leg.coordinates },
        },
      });
      mb.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': LEG_LINE_COLOR,
          'line-width': 2.5,
          'line-opacity': 0.75,
          'line-dasharray': [2, 1],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const p of layer.points) bounds.extend([p.lng, p.lat]);
    for (const leg of legLayers) {
      for (const c of leg.coordinates) bounds.extend(c);
    }
    if (!bounds.isEmpty()) {
      mb.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
    }
  }, [layer.points, legLayers, ready]);

  const overviewUrl = layer.overview_directions_url?.trim();

  if (!token) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardHeader className="py-3 pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {layer.headline_zh?.trim() || '行程地图'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex h-[200px] items-center justify-center rounded-xl bg-muted/50 text-center text-xs text-muted-foreground px-4">
            配置 <code className="mx-1 rounded bg-muted px-1">VITE_MAPBOX_ACCESS_TOKEN</code> 后显示地图。
            {layer.points.length > 0 ? (
              <span className="block mt-2">已接收 {layer.points.length} 个标注点。</span>
            ) : null}
          </div>
          {overviewUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => window.open(overviewUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              打开 Google 地图全览
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {layer.headline_zh?.trim() || '行程地图'}
            </CardTitle>
            {layer.summary_zh?.trim() ? (
              <CardDescription className="text-xs mt-1">{layer.summary_zh.trim()}</CardDescription>
            ) : null}
          </div>
          {overviewUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full text-xs gap-1.5 shrink-0"
              onClick={() => window.open(overviewUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Google 地图全览
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Array.from(pointsByKind.entries()).map(([kind, count]) => {
            const style = UNIFIED_MAP_POINT_STYLES[kind] ?? unifiedMapPointStyle(kind);
            return (
              <Badge
                key={kind}
                variant="outline"
                className="text-[10px] h-5 gap-1 border-border/70"
              >
                <span aria-hidden>{style.emoji}</span>
                {style.label} · {count}
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-3 px-3">
        <div
          ref={containerRef}
          className="h-[240px] w-full rounded-xl border border-border/60 overflow-hidden"
        />
      </CardContent>
    </Card>
  );
}
