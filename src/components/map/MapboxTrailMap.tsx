import { useCallback, useEffect, useRef, useState, useId } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken } from '@/lib/mapbox-token';
import { SEMANTIC_BLUE_HEX, SEMANTIC_GREEN_HEX, SEMANTIC_RED_HEX } from '@/lib/semantic-colors';
import { buildOfflineBasemapStyle } from '@/lib/offline-basemap-style';
import {
  EMPTY_TILE_DATA_URL,
  getCachedBlobUrl,
  isOfflineTileUrl,
  warmOfflineTilesForBounds,
} from '@/lib/offline-tile-blob-cache';
import type { LngLat } from '@/lib/map-geo';
import { coerceLngLatLine } from '@/features/exploration/lib/route-map.util';
import type { TileManifest } from '@/types/hiking-offline';
import type { OfflineTileFormat } from '@/types/trail-offline';

export type MapboxMapMarker = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
  /** 自定义 DOM 标记内容（优先于 color 圆点） */
  element?: HTMLElement;
};

export type MapboxMapStyle = 'light' | 'outdoors';

const STYLE_URL: Record<MapboxMapStyle, string> = {
  light: 'mapbox://styles/mapbox/light-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
};

export interface MapboxTrailMapProps {
  className?: string;
  height?: number | string;
  /** 路线折线 [lng, lat][] */
  lineCoordinates?: LngLat[];
  markers?: MapboxMapMarker[];
  center?: LngLat;
  zoom?: number;
  /** 有折线或 marker 时自动 fitBounds */
  fitBounds?: boolean;
  mapStyle?: MapboxMapStyle;
  lineColor?: string;
  lineWidth?: number;
  /** 已记录 GPS 轨迹（如 #88C0D0） */
  recordedLineCoordinates?: LngLat[];
  recordedLineColor?: string;
  /** 当前位置（执行页 GPS） */
  currentPosition?: { lng: number; lat: number };
  onMarkerClick?: (markerId: string) => void;
  emptyMessage?: string;
  /** 已缓存的离线底图（IndexedDB 瓦片 + tripnara-offline:// 协议） */
  offlineBasemap?: {
    packKey: string;
    manifest: TileManifest;
    format: OfflineTileFormat;
  };
  /** 为 true 且 offlineBasemap 有瓦片时使用离线底图（行中推荐 true） */
  useOfflineBasemap?: boolean;
}

export function MapboxTrailMap({
  className,
  height = 360,
  lineCoordinates,
  markers = [],
  center,
  zoom,
  fitBounds = true,
  mapStyle = 'outdoors',
  lineColor = SEMANTIC_GREEN_HEX,
  lineWidth = 4,
  recordedLineCoordinates,
  recordedLineColor = SEMANTIC_BLUE_HEX,
  currentPosition,
  onMarkerClick,
  emptyMessage,
  offlineBasemap,
  useOfflineBasemap = false,
}: MapboxTrailMapProps) {
  const token = getMapboxAccessToken();
  const routeLine = coerceLngLatLine(lineCoordinates);
  const recordedLine = coerceLngLatLine(recordedLineCoordinates);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const instanceId = useId().replace(/:/g, '');
  const routeSourceId = `trail-route-${instanceId}`;
  const routeLayerId = `trail-route-line-${instanceId}`;
  const gpsSourceId = `trail-gps-${instanceId}`;
  const gpsLayerId = `trail-gps-line-${instanceId}`;

  const hasGeometry =
    (routeLine?.length ?? 0) >= 2 ||
    (recordedLine?.length ?? 0) >= 2 ||
    markers.length > 0;

  const offlineStyleActive = Boolean(useOfflineBasemap && offlineBasemap?.packKey);

  /** 避免 markers/line 更新时重建 map（会触发 Style is not done loading） */
  const viewPropsRef = useRef({ center, lineCoordinates: routeLine, markers, zoom });
  viewPropsRef.current = { center, lineCoordinates: routeLine, markers, zoom };

  const refreshOfflineTileBlobs = useCallback(
    async (map: mapboxgl.Map) => {
      if (!offlineBasemap) return;
      const z = Math.max(0, Math.min(22, Math.round(map.getZoom())));
      const manifest = offlineBasemap.manifest;
      const zooms = manifest.recommendedCacheZoom?.length
        ? manifest.recommendedCacheZoom.filter((level) => Math.abs(level - z) <= 2)
        : [z];
      await warmOfflineTilesForBounds(
        offlineBasemap.packKey,
        manifest.bounds,
        zooms,
        offlineBasemap.format,
        120
      );
      map.triggerRepaint();
    },
    [offlineBasemap]
  );

  useEffect(() => {
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const { center: c, lineCoordinates: lines, markers: ms, zoom: z } = viewPropsRef.current;
    const defaultCenter: LngLat =
      c ?? lines?.[0] ?? (ms[0] ? [ms[0].lng, ms[0].lat] : [-19.0, 64.5]);

    const style =
      offlineStyleActive && offlineBasemap
        ? buildOfflineBasemapStyle(
            offlineBasemap.packKey,
            offlineBasemap.manifest.bounds,
            offlineBasemap.format,
            offlineBasemap.manifest.tiles.attribution
          )
        : STYLE_URL[mapStyle];

    const mb = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: defaultCenter,
      zoom: z ?? (lines && lines.length > 1 ? 8 : 6),
      attributionControl: false,
      transformRequest: (url, resourceType) => {
        if (resourceType === 'Tile' && isOfflineTileUrl(url)) {
          return { url: getCachedBlobUrl(url) ?? EMPTY_TILE_DATA_URL };
        }
        return { url };
      },
    });

    mb.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mb.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = mb;

    mb.on('error', (e) => {
      if (e.error?.message?.includes('aborted') || e.error?.name === 'AbortError') return;
      console.warn('[MapboxTrailMap]', e.error);
    });

    const onMapReady = () => {
      if (mapRef.current !== mb) return;
      setReady(true);
      if (offlineStyleActive) void refreshOfflineTileBlobs(mb);
    };

    mb.once('load', onMapReady);
    mb.on('moveend', () => {
      if (offlineStyleActive) void refreshOfflineTileBlobs(mb);
    });

    return () => {
      mb.off('load', onMapReady);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      currentMarkerRef.current?.remove();
      currentMarkerRef.current = null;
      mb.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [
    token,
    mapStyle,
    offlineStyleActive,
    offlineBasemap,
    refreshOfflineTileBlobs,
  ]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    const syncLayers = () => {
      if (!mapRef.current || mapRef.current !== mb || !mb.isStyleLoaded()) return;

      if (mb.getLayer(routeLayerId)) mb.removeLayer(routeLayerId);
      if (mb.getSource(routeSourceId)) mb.removeSource(routeSourceId);
      if (mb.getLayer(gpsLayerId)) mb.removeLayer(gpsLayerId);
      if (mb.getSource(gpsSourceId)) mb.removeSource(gpsSourceId);

      if (routeLine && routeLine.length >= 2) {
        mb.addSource(routeSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeLine,
            },
          },
        });
        mb.addLayer({
          id: routeLayerId,
          type: 'line',
          source: routeSourceId,
          paint: {
            'line-color': lineColor,
            'line-width': lineWidth,
            'line-opacity': 0.9,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
      }

      if (recordedLine && recordedLine.length >= 2) {
        mb.addSource(gpsSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: recordedLine,
            },
          },
        });
        mb.addLayer({
          id: gpsLayerId,
          type: 'line',
          source: gpsSourceId,
          paint: {
            'line-color': recordedLineColor,
            'line-width': 3,
            'line-opacity': 0.95,
            'line-dasharray': [2, 1],
          },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
      }

      if (fitBounds && hasGeometry) {
        const seed =
          routeLine?.[0] ??
          recordedLine?.[0] ??
          (markers[0] ? [markers[0].lng, markers[0].lat] : [0, 20]);
        const bounds = new mapboxgl.LngLatBounds(seed as LngLat, seed as LngLat);
        routeLine?.forEach((c) => bounds.extend(c));
        recordedLine?.forEach((c) => bounds.extend(c));
        markers.forEach((m) => bounds.extend([m.lng, m.lat]));
        if (currentPosition) bounds.extend([currentPosition.lng, currentPosition.lat]);
        mb.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
      } else if (center) {
        mb.setCenter(center);
        if (zoom != null) mb.setZoom(zoom);
      }
    };

    syncLayers();
    if (!mb.isStyleLoaded()) {
      mb.once('load', syncLayers);
    }

    return () => {
      mb.off('load', syncLayers);
    };
  }, [
    ready,
    routeLine,
    recordedLine,
    recordedLineColor,
    currentPosition,
    markers,
    center,
    zoom,
    fitBounds,
    hasGeometry,
    lineColor,
    lineWidth,
    routeSourceId,
    routeLayerId,
  ]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const m of markers) {
      let el = m.element;
      if (!el) {
        el = document.createElement('div');
        el.className =
          'h-3 w-3 rounded-full border-2 border-white shadow-md cursor-pointer';
        el.style.backgroundColor = m.color ?? SEMANTIC_GREEN_HEX;
      }
      if (m.label) el.title = m.label;
      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(m.id));
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([m.lng, m.lat])
        .addTo(mb);
      markersRef.current.push(marker);
    }
  }, [markers, ready, onMarkerClick]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;
    currentMarkerRef.current?.remove();
    currentMarkerRef.current = null;
    if (!currentPosition) return;
    const el = document.createElement('div');
    el.className =
      'h-4 w-4 rounded-full border-2 border-white bg-nara-glacier-foreground shadow-lg ring-4 ring-nara-glacier-border/40';
    el.title = '当前位置';
    currentMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([currentPosition.lng, currentPosition.lat])
      .addTo(mb);
    return () => {
      currentMarkerRef.current?.remove();
      currentMarkerRef.current = null;
    };
  }, [currentPosition, ready]);

  if (!token) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-dashed bg-muted/40 px-4 text-center text-sm text-muted-foreground',
          className
        )}
        style={{ height }}
      >
        <p>
          配置{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            VITE_MAPBOX_ACCESS_TOKEN
          </code>{' '}
          后显示地图
        </p>
      </div>
    );
  }

  if (!hasGeometry && emptyMessage) {
    return (
      <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ height }}>
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border border-border/60', className)}
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
