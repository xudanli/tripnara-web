import { describe, expect, it, vi, beforeEach } from 'vitest';

const { captureMessageMock } = vi.hoisted(() => ({
  captureMessageMock: vi.fn(),
}));

vi.mock('@/lib/sentry-init', () => ({
  captureSentryMessage: captureMessageMock,
  isSentryInitialized: () => true,
}));

import {
  WORLD_MODEL_OBSERVABILITY_EVENTS,
  reportSegmentLockMismatch,
} from '@/utils/world-model-observability';

describe('world-model-observability with sentry-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('calls captureSentryMessage when SDK is initialized', () => {
    reportSegmentLockMismatch({
      requestId: 'req-2',
      tripId: 'trip-2',
      unmatched: ['ghost'],
      lockedCount: 1,
      itemCount: 3,
    });

    expect(captureMessageMock).toHaveBeenCalledWith(
      'world_model.segment_lock_mismatch (1)',
      expect.objectContaining({
        level: 'warning',
        extra: expect.objectContaining({
          request_id: 'req-2',
          unmatched_ids: ['ghost'],
        }),
      }),
    );
  });

  it('still pushes dataLayer when window is present', () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal('window', { dataLayer } as unknown as Window);

    reportSegmentLockMismatch({
      unmatched: ['seg-x'],
      lockedCount: 1,
      itemCount: 1,
    });

    expect(dataLayer[0]).toEqual(
      expect.objectContaining({
        event: WORLD_MODEL_OBSERVABILITY_EVENTS.SEGMENT_LOCK_MISMATCH,
        unmatched_ids: ['seg-x'],
      }),
    );
  });
});
