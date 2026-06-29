import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearDecisionCheckerDeferredStore,
  discardStaleDecisionCheckerDeferred,
  ensureDecisionCheckerDeferredPolling,
  getActiveDecisionCheckerTaskId,
  isDecisionCheckerDeferredStale,
  registerDecisionCheckerDeferred,
  setDecisionCheckerDeferredReady,
} from '@/lib/decision-checker-deferred.store';

vi.mock('@/lib/planning-conflicts-deferred.util', () => ({
  pollUntilPlanningConflictsDecisionChecker: vi.fn(),
  clearPlanningConflictsDeferredPoll: vi.fn(),
  resolveDecisionCheckerPollIntervalMs: (deferred?: { pollIntervalMs?: number }) =>
    deferred?.pollIntervalMs ?? 5000,
}));

import { pollUntilPlanningConflictsDecisionChecker } from '@/lib/planning-conflicts-deferred.util';

describe('decision-checker-deferred.store', () => {
  beforeEach(() => {
    clearDecisionCheckerDeferredStore('trip-1');
    vi.clearAllMocks();
  });

  it('reuses same taskId on duplicate register', () => {
    registerDecisionCheckerDeferred('trip-1', {
      status: 'pending',
      taskId: 'dc-abc',
      pollIntervalMs: 5000,
    });
    registerDecisionCheckerDeferred('trip-1', {
      status: 'pending',
      taskId: 'dc-abc',
      pollIntervalMs: 3000,
    });
    expect(getActiveDecisionCheckerTaskId('trip-1')).toBe('dc-abc');
  });

  it('accepts new taskId when server supersedes old pending', () => {
    registerDecisionCheckerDeferred('trip-1', { status: 'pending', taskId: 'dc-old' });
    registerDecisionCheckerDeferred('trip-1', { status: 'pending', taskId: 'dc-new' });
    expect(getActiveDecisionCheckerTaskId('trip-1')).toBe('dc-new');
  });

  it('discards stale pending after 90s', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    registerDecisionCheckerDeferred('trip-1', { status: 'pending', taskId: 'dc-abc' });
    expect(isDecisionCheckerDeferredStale('trip-1', now + 89_999)).toBe(false);
    expect(isDecisionCheckerDeferredStale('trip-1', now + 90_000)).toBe(true);
    vi.mocked(Date.now).mockReturnValue(now + 90_000);
    expect(discardStaleDecisionCheckerDeferred('trip-1')).toBe(true);
    expect(getActiveDecisionCheckerTaskId('trip-1')).toBeNull();
    vi.mocked(Date.now).mockRestore();
  });

  it('starts single poll loop', async () => {
    vi.mocked(pollUntilPlanningConflictsDecisionChecker).mockResolvedValue({
      tripId: 'trip-1',
      summary: { total: 0, mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
      conflicts: [],
      decisionChecker: { tripId: 'trip-1' } as never,
    });

    registerDecisionCheckerDeferred('trip-1', { status: 'pending', taskId: 'dc-abc', pollIntervalMs: 5000 });
    ensureDecisionCheckerDeferredPolling('trip-1');
    ensureDecisionCheckerDeferredPolling('trip-1');

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pollUntilPlanningConflictsDecisionChecker).toHaveBeenCalledTimes(1);
  });

  it('marks ready and stops polling', () => {
    registerDecisionCheckerDeferred('trip-1', { status: 'pending', taskId: 'dc-abc' });
    setDecisionCheckerDeferredReady('trip-1', { tripId: 'trip-1' } as never);
    expect(getActiveDecisionCheckerTaskId('trip-1')).toBe('dc-abc');
  });
});
