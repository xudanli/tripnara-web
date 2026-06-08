import type { HikingSegment } from '@/types/hiking-embedded';

const MAX_SEGMENTS = 3;

export function parseHikingSegments(metadata?: Record<string, unknown>): HikingSegment[] {
  const raw = metadata?.hikingSegments;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is HikingSegment =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as HikingSegment).segmentId === 'string' &&
      typeof (s as HikingSegment).startDate === 'string'
  );
}

/**
 * 合并写入 PUT /trips/:id 的 metadata。
 * 顶层键浅合并；`hikingSegments` 由调用方传**完整数组**（后端整数组替换，非按 segmentId merge）。
 * @see docs/api/embedded-hiking-trip-metadata.md
 */
export function mergeTripMetadata(
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...patch };
}

export function dateInSegment(dayDate: string, segment: HikingSegment): boolean {
  const d = dayDate.split('T')[0];
  const start = segment.startDate.split('T')[0];
  const end = (segment.endDate ?? segment.startDate).split('T')[0];
  return d >= start && d <= end;
}

export function segmentCoversDay(segments: HikingSegment[], dayDate: string): HikingSegment | undefined {
  return segments.find((s) => dateInSegment(dayDate, s));
}

export function validateSegmentDates(
  segment: Pick<HikingSegment, 'startDate' | 'endDate'>,
  tripStart?: string,
  tripEnd?: string
): string | null {
  if (!tripStart || !tripEnd) return null;
  const t0 = tripStart.split('T')[0];
  const t1 = tripEnd.split('T')[0];
  const s0 = segment.startDate.split('T')[0];
  const s1 = (segment.endDate ?? segment.startDate).split('T')[0];
  if (s0 < t0 || s1 > t1) return '徒步日期须落在行程起止日期内';
  if (s1 < s0) return '结束日期不能早于开始日期';
  return null;
}

export function canAddSegment(currentCount: number): boolean {
  return currentCount < MAX_SEGMENTS;
}

/** 片段日期跨度（含首尾两日），用于 generate-plan durationDays */
export function segmentSpanDays(segments: HikingSegment[]): number {
  if (segments.length === 0) return 0;
  let min = segments[0].startDate.split('T')[0];
  let max = (segments[0].endDate ?? segments[0].startDate).split('T')[0];
  for (const s of segments) {
    const start = s.startDate.split('T')[0];
    const end = (s.endDate ?? s.startDate).split('T')[0];
    if (start < min) min = start;
    if (end > max) max = end;
  }
  const ms = new Date(max).getTime() - new Date(min).getTime();
  return Math.max(1, Math.ceil(ms / 86400000) + 1);
}

export function segmentDateRange(
  segments: HikingSegment[]
): { startDate: string; endDate: string } | null {
  if (segments.length === 0) return null;
  let min = segments[0].startDate.split('T')[0];
  let max = (segments[0].endDate ?? segments[0].startDate).split('T')[0];
  for (const s of segments) {
    const start = s.startDate.split('T')[0];
    const end = (s.endDate ?? s.startDate).split('T')[0];
    if (start < min) min = start;
    if (end > max) max = end;
  }
  return { startDate: min, endDate: max };
}

export function buildEmbeddedHikingSignals(segments: HikingSegment[]) {
  const range = segmentDateRange(segments);
  return {
    segmentCount: segments.length,
    effectiveDays: segmentSpanDays(segments),
    startDate: range?.startDate,
    endDate: range?.endDate,
  };
}

export function dayOverlapsAnySegment(dayDate: string, segments: HikingSegment[]): boolean {
  return segments.some((s) => dateInSegment(dayDate, s));
}

export function removeSegment(segments: HikingSegment[], segmentId: string): HikingSegment[] {
  return segments.filter((s) => s.segmentId !== segmentId);
}

export function upsertSegment(segments: HikingSegment[], next: HikingSegment): HikingSegment[] {
  const i = segments.findIndex((s) => s.segmentId === next.segmentId);
  if (i < 0) return [...segments, next];
  const copy = [...segments];
  copy[i] = next;
  return copy;
}

export { MAX_SEGMENTS };
