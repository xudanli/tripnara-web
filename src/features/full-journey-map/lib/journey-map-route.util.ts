import polyline from '@mapbox/polyline';

/** 解码 Mapbox/Google encoded polyline → [lng, lat][] */
export function decodeRoutePolyline(encoded?: string | null): [number, number][] {
  if (!encoded?.trim()) return [];
  try {
    const decoded = polyline.decode(encoded);
    return decoded.map(([lat, lng]) => [lng, lat] as [number, number]);
  } catch {
    return [];
  }
}

export function lineCoordinates(
  from: [number, number],
  to: [number, number],
  encodedPolyline?: string | null,
): [number, number][] {
  const decoded = decodeRoutePolyline(encodedPolyline);
  if (decoded.length >= 2) return decoded;
  return [from, to];
}

export function polylineMidpoint(coords: [number, number][]): [number, number] | null {
  if (coords.length === 0) return null;
  if (coords.length === 1) return coords[0]!;
  const idx = Math.floor(coords.length / 2);
  return coords[idx]!;
}

export function createRouteLabelElement(
  label: string,
  opts?: { accentColor?: string; variant?: 'branch' | 'merge' },
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'journey-map-route-label';
  if (opts?.variant === 'merge') {
    el.classList.add('journey-map-route-label--merge');
  } else if (opts?.accentColor) {
    el.style.setProperty('--route-label-accent', opts.accentColor);
  }
  el.textContent = label;
  return el;
}

/** 高保真 · 路线上的 Day N 标签（底色 = 当日路线色） */
export function createDayLabelElement(
  label: string,
  opts: { backgroundColor: string; selected?: boolean },
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'journey-map-day-label';
  if (opts.selected) {
    el.classList.add('journey-map-day-label--selected');
  }
  el.style.backgroundColor = opts.backgroundColor;
  el.textContent = label;
  return el;
}
