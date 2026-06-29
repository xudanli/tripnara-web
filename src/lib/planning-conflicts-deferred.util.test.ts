import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  pollUntilPlanningConflictsDecisionChecker,
  clearPlanningConflictsDeferredPoll,
  PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT,
  resolveDecisionCheckerPollIntervalMs,
} from '@/lib/planning-conflicts-deferred.util';

vi.mock('@/api/trips', () => ({
  tripsApi: {
    getPlanningConflicts: vi.fn(),
  },
}));

import { tripsApi } from '@/api/trips';

describe('pollUntilPlanningConflictsDecisionChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlanningConflictsDeferredPoll('dc_embed_abc');
  });

  it('returns immediately when poll response includes decisionChecker', async () => {
    vi.mocked(tripsApi.getPlanningConflicts)
      .mockResolvedValueOnce({
        tripId: 't1',
        summary: { total: 0, mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
        conflicts: [],
        decisionChecker: { tripId: 't1', overview: { conflict: { hardCount: 1 } } } as never,
      });

    const res = await pollUntilPlanningConflictsDecisionChecker(
      't1',
      { status: 'pending', taskId: 'dc_embed_abc' },
      { intervalMs: 1, maxAttempts: 3 },
    );

    expect(res.decisionChecker).toBeTruthy();
    expect(tripsApi.getPlanningConflicts).toHaveBeenCalledWith('t1', {
      decisionCheckerTaskId: 'dc_embed_abc',
    });
  });

  it('polls until ready', async () => {
    vi.mocked(tripsApi.getPlanningConflicts)
      .mockResolvedValueOnce({
        tripId: 't1',
        summary: { total: 1, mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
        conflicts: [],
        decisionCheckerDeferred: { status: 'pending', taskId: 'dc_embed_abc' },
      })
      .mockResolvedValueOnce({
        tripId: 't1',
        summary: { total: 1, mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0, byCategory: {} },
        conflicts: [],
        decisionChecker: { tripId: 't1', overview: { conflict: { hardCount: 1 } } } as never,
        decisionCheckerDeferred: { status: 'ready', taskId: 'dc_embed_abc' },
      });

    const res = await pollUntilPlanningConflictsDecisionChecker(
      't1',
      { status: 'pending', taskId: 'dc_embed_abc' },
      { intervalMs: 1, maxAttempts: 5 },
    );

    expect(res.decisionChecker).toBeTruthy();
    expect(tripsApi.getPlanningConflicts).toHaveBeenCalledTimes(2);
  });

  it('throws on failed deferred status', async () => {
    await expect(
      pollUntilPlanningConflictsDecisionChecker('t1', {
        status: 'failed',
        taskId: 'dc_embed_abc',
        error: 'compute error',
      }),
    ).rejects.toThrow('compute error');
  });

  it('uses pollIntervalMs from deferred when present', () => {
    expect(resolveDecisionCheckerPollIntervalMs({ status: 'pending', taskId: 'x', pollIntervalMs: 8000 })).toBe(8000);
    expect(resolveDecisionCheckerPollIntervalMs({ status: 'pending', taskId: 'x' })).toBe(PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT);
    expect(PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT).toBe(5000);
  });
});
