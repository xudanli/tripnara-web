import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  WORLD_MODEL_OBSERVABILITY_EVENTS,
  reportSegmentLockMismatch,
} from '@/utils/world-model-observability';

describe('world-model-observability', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { window?: Window }).window;
  });

  it('no-ops when unmatched list is empty', () => {
    reportSegmentLockMismatch({
      unmatched: [],
      lockedCount: 1,
      itemCount: 2,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('pushes dataLayer and calls legacy window.Sentry when available', () => {
    const captureMessage = vi.fn();
    const dataLayer: unknown[] = [];

    vi.stubGlobal('window', {
      dataLayer,
      Sentry: { captureMessage },
    } as unknown as Window);

    reportSegmentLockMismatch({
      requestId: 'req-1',
      tripId: 'trip-1',
      unmatched: ['ghost-segment'],
      lockedCount: 2,
      itemCount: 5,
    });

    expect(dataLayer).toEqual([
      expect.objectContaining({
        event: WORLD_MODEL_OBSERVABILITY_EVENTS.SEGMENT_LOCK_MISMATCH,
        request_id: 'req-1',
        trip_id: 'trip-1',
        unmatched_ids: ['ghost-segment'],
      }),
    ]);
    expect(captureMessage).toHaveBeenCalledWith(
      'world_model.segment_lock_mismatch (1)',
      expect.objectContaining({
        level: 'warning',
        extra: expect.objectContaining({ item_count: 5 }),
      }),
    );
  });
});
