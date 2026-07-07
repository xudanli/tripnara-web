import { useMemo } from 'react';
import type { SupplyPoi } from '@/types/hiking';
import { cn } from '@/lib/utils';
interface SupplyPoisSchematicProps {
  pois: SupplyPoi[];
  polyline?: Array<{ lat: number; lng: number }>;
  className?: string;
}

function poiFill(subCategory: string): string {
  const c = subCategory.toUpperCase();
  if (c.includes('HUT')) return '#88C0D0';
  if (c.includes('RIVER')) return '#0891b2';
  if (c.includes('ROUTE_GATE')) return '#64748b';
  return '#0f172a';
}

export function SupplyPoisSchematic({
  pois,
  polyline,
  className,
}: SupplyPoisSchematicProps) {
  const { pathD, projected } = useMemo(() => {
    const pts =
      polyline?.length && polyline.length >= 2
        ? polyline
        : pois.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (!pts.length) {
      return { pathD: '', projected: [] as Array<SupplyPoi & { x: number; y: number }> };
    }

    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.0001);
    const lngSpan = Math.max(maxLng - minLng, 0.0001);

    const project = (lat: number, lng: number) => ({
      x: 8 + ((lng - minLng) / lngSpan) * 84,
      y: 92 - ((lat - minLat) / latSpan) * 80,
    });

    const pathCoords = pts.map((p, i) => {
      const { x, y } = project(p.lat, p.lng);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    const projected = pois.map((poi) => {
      const { x, y } = project(poi.lat, poi.lng);
      return { ...poi, x, y };
    });

    return { pathD: pathCoords.join(' '), projected };
  }, [pois, polyline]);

  return (
    <div
      className={cn(
        'relative h-56 overflow-hidden rounded-2xl bg-gradient-to-b from-muted/20 to-muted/50',
        className
      )}
    >
      <p className="absolute left-4 top-3 text-xs text-muted-foreground">2.5D 补给 / 山屋</p>
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray="2,1"
            className="text-foreground/25"
          />
        )}
        {projected.map((poi) => (
          <g key={poi.id}>
            <circle
              cx={poi.x}
              cy={poi.y}
              r="2.4"
              fill={poiFill(poi.subCategory)}
              stroke="#fff"
              strokeWidth="0.5"
            />
            <title>{`${poi.nameCN} (${poi.subCategory})`}</title>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-2 left-3 right-3 flex flex-wrap gap-1">
        {projected.slice(0, 4).map((p) => (
          <span
            key={p.id}
            className="truncate rounded bg-background/80 px-1.5 py-0.5 text-[9px] text-muted-foreground backdrop-blur"
          >
            {p.nameCN}
          </span>
        ))}
      </div>
    </div>
  );
}
