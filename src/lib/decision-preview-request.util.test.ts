import { describe, expect, it, vi } from 'vitest';
import {
  dedupeDecisionPreviewRequest,
  decisionPreviewRequestKey,
} from '@/lib/decision-preview-request.util';

describe('decision-preview-request', () => {
  it('builds stable cache keys', () => {
    expect(decisionPreviewRequestKey('trip-1', 'problem-1', 'option-a')).toBe(
      'trip-1:problem-1:option-a',
    );
  });

  it('dedupes concurrent preview requests for the same key', async () => {
    const factory = vi.fn(async () => ({ optionId: 'option-a', tradeoffs: [] }));

    const first = dedupeDecisionPreviewRequest('k1', factory);
    const second = dedupeDecisionPreviewRequest('k1', factory);

    expect(first).toBe(second);
    await first;
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('allows a new request after the prior one settles', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const factory = vi.fn(async () => {
      await gate;
      return { optionId: 'option-a', tradeoffs: [] as [] };
    });

    const pending = dedupeDecisionPreviewRequest('k2', factory);
    release();
    await pending;

    await dedupeDecisionPreviewRequest('k2', factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
