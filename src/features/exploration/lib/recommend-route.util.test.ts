import { describe, expect, it } from 'vitest';
import { pickRecommendedCompareRoute } from './recommend-route.util';
import type { CompareRouteCard } from '../types';

const card = (partial: Partial<CompareRouteCard> & Pick<CompareRouteCard, 'id' | 'title'>): CompareRouteCard => ({
  apiRouteId: partial.apiRouteId ?? partial.id,
  gains: [],
  sacrifices: [],
  ...partial,
});

describe('pickRecommendedCompareRoute', () => {
  it('prefers badge.recommended over matchScore', () => {
    const routes = [
      card({ id: 'a', title: 'A', matchScore: 99 }),
      card({ id: 'b', title: 'B', matchScore: 10, badge: { label: '推荐', tone: 'recommended' } }),
    ];
    expect(pickRecommendedCompareRoute(routes)?.id).toBe('b');
  });

  it('falls back to highest matchScore', () => {
    const routes = [
      card({ id: 'a', title: 'A', matchScore: 40 }),
      card({ id: 'b', title: 'B', matchScore: 88 }),
    ];
    expect(pickRecommendedCompareRoute(routes)?.id).toBe('b');
  });
});
