/**
 * 因果世界模型可观测性：segment lock 对齐、dataLayer、Sentry SDK（可选）。
 */

import { captureSentryMessage } from '@/lib/sentry-init';

export const WORLD_MODEL_OBSERVABILITY_EVENTS = {
  SEGMENT_LOCK_MISMATCH: 'world_model_segment_lock_mismatch',
} as const;

export interface SegmentLockMismatchPayload {
  requestId?: string;
  tripId?: string | null;
  unmatched: string[];
  lockedCount: number;
  itemCount: number;
}

type SentryLike = {
  captureMessage?: (message: string, captureContext?: { level?: string; extra?: Record<string, unknown> }) => void;
  captureException?: (error: unknown, captureContext?: { extra?: Record<string, unknown> }) => void;
};

function readLegacyWindowSentry(): SentryLike | undefined {
  if (typeof window === 'undefined') return undefined;
  const sentry = (window as Window & { Sentry?: SentryLike }).Sentry;
  return sentry && typeof sentry === 'object' ? sentry : undefined;
}

function pushDataLayer(event: string, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (!Array.isArray(dataLayer)) return;
  dataLayer.push({ event, ...properties });
}

function reportViaLegacyWindowSentry(message: string, properties: Record<string, unknown>): void {
  const sentry = readLegacyWindowSentry();
  if (!sentry) return;
  try {
    if (sentry.captureMessage) {
      sentry.captureMessage(message, { level: 'warning', extra: properties });
    } else if (sentry.captureException) {
      sentry.captureException(new Error(message), { extra: properties });
    }
  } catch {
    // best-effort
  }
}

export function reportSegmentLockMismatch(payload: SegmentLockMismatchPayload): void {
  if (payload.unmatched.length === 0) return;

  const properties: Record<string, unknown> = {
    request_id: payload.requestId,
    trip_id: payload.tripId ?? undefined,
    unmatched_ids: payload.unmatched,
    locked_count: payload.lockedCount,
    item_count: payload.itemCount,
  };

  if (import.meta.env.DEV) {
    console.warn('[worldModelObservability] segment lock mismatch', properties);
  }

  pushDataLayer(WORLD_MODEL_OBSERVABILITY_EVENTS.SEGMENT_LOCK_MISMATCH, properties);

  const message = `world_model.segment_lock_mismatch (${payload.unmatched.length})`;
  captureSentryMessage(message, { level: 'warning', extra: properties });
  reportViaLegacyWindowSentry(message, properties);
}
