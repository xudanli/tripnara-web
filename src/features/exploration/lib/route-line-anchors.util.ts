import type { LngLat } from '@/lib/map-geo';
import {
  isReasonableIcelandMapPoint,
  normalizeRouteMapPoint,
} from './normalize-route-map-point';

export interface DayMapAnchor {
  day: number;
  lng: number;
  lat: number;
}

/** mapPoint 与路线吸附距离超过此值则改用沿路线等距分布 */
export const MAX_MAPPOINT_SNAP_DISTANCE_KM = 30;

function haversineKm(a: LngLat, b: LngLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function interpolateLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function buildLineMetrics(line: LngLat[]): { segLens: number[]; total: number } {
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const len = haversineKm(line[i - 1]!, line[i]!);
    segLens.push(len);
    total += len;
  }
  return { segLens, total };
}

/** 沿折线按路径距离等分采样 count 个点（含起终点） */
export function samplePointsAlongLine(line: LngLat[], count: number): LngLat[] {
  if (count <= 0 || line.length === 0) return [];
  if (count === 1) return [line[Math.floor(line.length / 2)]!];
  if (line.length === 1) return Array.from({ length: count }, () => line[0]!);

  const { segLens, total } = buildLineMetrics(line);

  if (total <= 0) {
    return Array.from({ length: count }, (_, i) =>
      line[Math.round((i / (count - 1)) * (line.length - 1))]!,
    );
  }

  const targets = Array.from({ length: count }, (_, i) => (i / (count - 1)) * total);
  const samples: LngLat[] = [];
  let segIdx = 0;
  let distBefore = 0;

  for (const target of targets) {
    while (segIdx < segLens.length && distBefore + segLens[segIdx]! < target) {
      distBefore += segLens[segIdx]!;
      segIdx++;
    }
    if (segIdx >= segLens.length) {
      samples.push(line[line.length - 1]!);
      continue;
    }
    const segLen = segLens[segIdx]!;
    const t = segLen > 0 ? (target - distBefore) / segLen : 0;
    samples.push(interpolateLngLat(line[segIdx]!, line[segIdx + 1]!, t));
  }

  return samples;
}

/** 将点吸附到折线上最近的位置 */
export function snapPointToPolyline(point: LngLat, line: LngLat[]): LngLat {
  if (line.length === 0) return point;
  if (line.length === 1) return line[0]!;

  let best = line[0]!;
  let bestDist = Infinity;

  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    const t =
      lenSq > 0
        ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq))
        : 0;
    const candidate = interpolateLngLat(a, b, t);
    const dist = haversineKm(point, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best;
}

/** 折线上的相对进度 0–1（按路径距离） */
export function pointProgressAlongLine(point: LngLat, line: LngLat[]): number {
  if (line.length < 2) return 0;

  const { segLens, total } = buildLineMetrics(line);
  if (total <= 0) return 0;

  let bestProgress = 0;
  let bestDist = Infinity;
  let distBefore = 0;

  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    const t =
      lenSq > 0
        ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lenSq))
        : 0;
    const candidate = interpolateLngLat(a, b, t);
    const dist = haversineKm(point, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestProgress = (distBefore + (segLens[i] ?? 0) * t) / total;
    }
    distBefore += segLens[i] ?? 0;
  }

  return bestProgress;
}

/**
 * 已有贴路折线时，将 day 标记吸附到路线上：
 * - 合法且距路线足够近的 mapPoint → 沿路线单调前进吸附
 * - 其余 → 按 day 序号在路线上等距分布
 */
export function deriveDayAnchorsFromRouteLine(
  line: LngLat[],
  days: Array<{ day: number; mapPoint?: { lng: number; lat: number } }>,
): DayMapAnchor[] {
  const sorted = [...days].sort((a, b) => a.day - b.day);
  if (sorted.length === 0 || line.length < 2) return [];

  const spaced = samplePointsAlongLine(line, sorted.length);

  return sorted.map((d, index) => {
    const fallback = spaced[index] ?? spaced[spaced.length - 1]!;
    const raw = normalizeRouteMapPoint(d.mapPoint);

    if (raw && isReasonableIcelandMapPoint(raw)) {
      const rawPoint: LngLat = [raw.lng, raw.lat];
      const snapped = snapPointToPolyline(rawPoint, line);
      const snapDistance = haversineKm(rawPoint, snapped);

      if (snapDistance <= MAX_MAPPOINT_SNAP_DISTANCE_KM) {
        return { day: d.day, lng: snapped[0], lat: snapped[1] };
      }
    }

    return { day: d.day, lng: fallback[0], lat: fallback[1] };
  });
}
