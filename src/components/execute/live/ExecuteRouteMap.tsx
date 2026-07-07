import { useEffect, useRef, useState, type CSSProperties } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Car, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXECUTE_ROUTE_MAP, EXECUTE_ROUTE_MAP_LEGEND } from './execute-route-map-tokens';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

export interface ExecuteRouteMapPoint {
  lat: number;
  lng: number;
  label?: string;
  kind?: 'current' | 'stop' | 'plan_b';
}

interface ExecuteRouteMapProps {
  points: ExecuteRouteMapPoint[];
  routeCoordinates?: [number, number][];
  planBRouteCoordinates?: [number, number][];
  className?: string;
  height?: number | string;
  showLegend?: boolean;
  vehicleTimeLabel?: string;
}

function legendSwatchStyle(color: string, dashed: boolean): CSSProperties {
  if (dashed) {
    return {
      backgroundColor: 'transparent',
      borderColor: color,
      borderWidth: 2,
      borderStyle: 'dashed',
    };
  }
  return { backgroundColor: color };
}

export function ExecuteRouteMap({
  points,
  routeCoordinates,
  planBRouteCoordinates,
  className,
  height = 120,
  showLegend = false,
  vehicleTimeLabel,
}: ExecuteRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  const lineCoords = routeCoordinates?.length
    ? routeCoordinates
    : points.length >= 2
      ? (points.map((p) => [p.lng, p.lat]) as [number, number][])
      : undefined;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || points.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center = points[0];
    const mb = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center.lng, center.lat],
      zoom: 8,
      attributionControl: false,
    });
    mb.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mb.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = mb;

    mb.on('load', () => {
      if (lineCoords && lineCoords.length >= 2) {
        mb.addSource('execute-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        });
        mb.addLayer({
          id: 'execute-route-line',
          type: 'line',
          source: 'execute-route',
          paint: {
            'line-color': EXECUTE_ROUTE_MAP.routeActiveHex,
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });
      }

      if (planBRouteCoordinates && planBRouteCoordinates.length >= 2) {
        mb.addSource('execute-plan-b', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: planBRouteCoordinates },
          },
        });
        mb.addLayer({
          id: 'execute-plan-b-line',
          type: 'line',
          source: 'execute-plan-b',
          paint: {
            'line-color': EXECUTE_ROUTE_MAP.routePlanBHex,
            'line-width': 3,
            'line-opacity': 0.85,
            'line-dasharray': [2, 2],
          },
        });
      }

      if (lineCoords && lineCoords.length >= 2) {
        const bounds = new mapboxgl.LngLatBounds(lineCoords[0], lineCoords[0]);
        for (const c of lineCoords) bounds.extend(c as [number, number]);
        mb.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
      } else if (points.length) {
        const bounds = new mapboxgl.LngLatBounds(
          [points[0].lng, points[0].lat],
          [points[0].lng, points[0].lat],
        );
        for (const p of points) bounds.extend([p.lng, p.lat]);
        mb.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 });
      }

      setReady(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mb.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [lineCoords, planBRouteCoordinates, points]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const p of points) {
      if (p.kind === 'current') {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col items-center gap-1';

        if (vehicleTimeLabel) {
          const bubble = document.createElement('div');
          bubble.className =
            'rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm whitespace-nowrap';
          bubble.textContent = `当前车辆 ${vehicleTimeLabel}`;
          wrap.appendChild(bubble);
        }

        const el = document.createElement('div');
        el.className =
          'flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-md';
        el.style.backgroundColor = EXECUTE_ROUTE_MAP.vehicleMarkerHex;
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
        wrap.appendChild(el);

        const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .addTo(mb);
        markersRef.current.push(marker);
        continue;
      }

      const el = document.createElement('div');
      el.className =
        'rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-md border border-white/20';
      el.style.backgroundColor =
        p.kind === 'plan_b' ? EXECUTE_ROUTE_MAP.planBStopHex : EXECUTE_ROUTE_MAP.stopMarkerHex;
      el.textContent = p.label ?? '';
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([p.lng, p.lat])
        .addTo(mb);
      markersRef.current.push(marker);
    }
  }, [points, ready, vehicleTimeLabel]);

  if (!MAPBOX_TOKEN || points.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        <MapPin className="h-8 w-8 mb-2 opacity-40" />
        <Car className="h-5 w-5 mb-2 opacity-30" />
        <p className="text-xs">{MAPBOX_TOKEN ? '暂无路线坐标' : '地图未配置'}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full', className)}>
      <div ref={containerRef} className="rounded-xl overflow-hidden border h-full min-h-[120px]" style={{ height }} />
      {showLegend ? (
        <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {EXECUTE_ROUTE_MAP_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="h-1.5 w-6 shrink-0 rounded-full"
                  style={legendSwatchStyle(item.color, item.dashed)}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
