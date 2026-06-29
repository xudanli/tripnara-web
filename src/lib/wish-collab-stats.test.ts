import { describe, expect, it } from 'vitest';
import { buildWishCollabStats } from './wish-collab-stats';
import type { TeamWishItem, TripWishItem, WishSummary } from '@/types/trip-wishes';

const baseWish = (overrides: Partial<TripWishItem>): TripWishItem => ({
  id: 'w1',
  tripId: 't1',
  userId: 'u1',
  category: 'activities',
  text: 'test',
  importance: 3,
  inputMode: 'free_text',
  sourceRef: null,
  visibility: 'private',
  agentEligible: false,
  structuredHints: null,
  status: 'active',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('buildWishCollabStats', () => {
  it('derives included and optimize counts from summary', () => {
    const mine = [
      baseWish({ id: 'w1', agentEligible: true }),
      baseWish({ id: 'w2', agentEligible: false }),
    ];
    const summary: WishSummary = {
      mineCount: 2,
      teamCount: 1,
      privateCount: 1,
      agentEligibleCount: 2,
      impactByDay: [{ dayIndex: 1, impactCount: 1, wishIds: ['w1'] }],
    };

    const stats = buildWishCollabStats(mine, [], summary);
    expect(stats.includedInPlanCount).toBe(1);
    expect(stats.toOptimizeCount).toBe(2);
    expect(stats.totalCount).toBe(3);
  });
});
