import { useCallback, useEffect, useRef, useState, useId } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { getMapboxAccessToken } from '@/lib/mapbox-token';
import { buildOfflineBasemapStyle } from '@/lib/offline-basemap-style';
import {
  EMPTY_TILE_DATA_URL,
  getCachedBlobUrl,
  isOfflineTileUrl,
  warmOfflineTilesForBounds,
} from '@/lib/offline-tile-blob-cache';
import type { LngLat } from '@/lib/map-geo';
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
  /** 已记录 GPS 轨迹（如 #2563eb） */
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
  lineColor = '#0f766e',
  lineWidth = 4,
  recordedLineCoordinates,
  recordedLineColor = '#2563eb',
  currentPosition,
  onMarkerClick,
  emptyMessage,
  offlineBasemap,
  useOfflineBasemap = false,
}: MapboxTrailMapProps) {
  const token = getMapboxAccessToken();
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
    (lineCoordinates?.length ?? 0) >= 2 ||
    (recordedLineCoordinates?.length ?? 0) >= 2 ||
    markers.length > 0;

  const offlineStyleActive = Boolean(useOfflineBasemap && offlineBasemap?.packKey);

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

    const defaultCenter: LngLat =
      center ??
      lineCoordinates?.[0] ??
      (markers[0] ? [markers[0].lng, markers[0].lat] : [0, 20]);

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
      zoom: zoom ?? (lineCoordinates && lineCoordinates.length > 1 ? 8 : 5),
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
      setReady(true);
      if (offlineStyleActive) void refreshOfflineTileBlobs(mb);
    };

    mb.on('load', onMapReady);
    mb.on('moveend', () => {
      if (offlineStyleActive) void refreshOfflineTileBlobs(mb);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
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
    center,
    lineCoordinates,
    markers,
    zoom,
  ]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    if (mb.getLayer(routeLayerId)) mb.removeLayer(routeLayerId);
    if (mb.getSource(routeSourceId)) mb.removeSource(routeSourceId);
    if (mb.getLayer(gpsLayerId)) mb.removeLayer(gpsLayerId);
    if (mb.getSource(gpsSourceId)) mb.removeSource(gpsSourceId);

    if (lineCoordinates && lineCoordinates.length >= 2) {
      mb.addSource(routeSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: lineCoordinates,
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

    if (recordedLineCoordinates && recordedLineCoordinates.length >= 2) {
      mb.addSource(gpsSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: recordedLineCoordinates,
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
        lineCoordinates?.[0] ??
        recordedLineCoordinates?.[0] ??
        (markers[0] ? [markers[0].lng, markers[0].lat] : [0, 20]);
      const bounds = new mapboxgl.LngLatBounds(seed, seed);
      lineCoordinates?.forEach((c) => bounds.extend(c));
      recordedLineCoordinates?.forEach((c) => bounds.extend(c));
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      if (currentPosition) bounds.extend([currentPosition.lng, currentPosition.lat]);
      mb.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
    } else if (center) {
      mb.setCenter(center);
      if (zoom != null) mb.setZoom(zoom);
    }
  }, [
    ready,
    lineCoordinates,
    recordedLineCoordinates,
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
        el.style.backgroundColor = m.color ?? '#0f766e';
      }
      if (m.label) el.title = m.label;
      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(m.id));
      }

      const marker = new mapboxgl.Marker({ element: el })
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
      'h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg ring-4 ring-blue-400/40';
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
