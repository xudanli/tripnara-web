export type TimelineScoreTone = 'verified' | 'confirm' | 'neutral';

export function resolveTimelineScoreLabel(score: number | null | undefined): {
  label: string;
  tone: TimelineScoreTone;
} {
  if (score == null || !Number.isFinite(score)) {
    return { label: '—', tone: 'neutral' };
  }
  if (score >= 70) return { label: '良好', tone: 'verified' };
  if (score >= 50) return { label: '待优化', tone: 'confirm' };
  return { label: '需关注', tone: 'confirm' };
}

import { formatTimelinePendingSubtext } from '@/lib/trip-detail-terminology.util';

export function resolvePendingActionSubtext(
  pendingConfirmationCount: number,
  conflictCount: number,
  filesPendingCount?: number,
): string {
  return formatTimelinePendingSubtext({
    pendingConfirmationCount,
    conflictCount,
    filesPendingCount,
  });
}

export function resolveReminderBody(
  explanation?: string,
  message?: string,
): string {
  const text = explanation?.trim() || message?.trim();
  return text || '';
}
