import type { HikingSegment } from '@/types/hiking-embedded';

const NSR_HOURS = 48;

/** 徒步开始前 48h 内应完成 Readiness（NSR 口径） */
export function isWithinNsrWindow(segment: HikingSegment, now = new Date()): boolean {
  const start = new Date(segment.startDate.split('T')[0]);
  const diffMs = start.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours > 0 && hours <= NSR_HOURS;
}

export function segmentNeedsReadiness(segment: HikingSegment, now = new Date()): boolean {
  if (segment.readinessSnapshot?.level) {
    const level = segment.readinessSnapshot.level.toLowerCase();
    if (level === 'ready' || level === 'caution') return false;
  }
  return isWithinNsrWindow(segment, now) || daysUntilStart(segment, now) <= 7;
}

function daysUntilStart(segment: HikingSegment, now: Date): number {
  const start = new Date(segment.startDate.split('T')[0]);
  return Math.ceil((start.getTime() - now.getTime()) / 86400000);
}

export function buildReadinessSnapshotFromRoute(level: string, score: number): {
  level: string;
  score: number;
  evaluatedAt: string;
} {
  return {
    level,
    score,
    evaluatedAt: new Date().toISOString(),
  };
}
