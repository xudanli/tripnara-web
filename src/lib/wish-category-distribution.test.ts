import { describe, expect, it } from 'vitest';
import { buildWishCategoryDistribution } from './wish-category-distribution';
import type { TripWishItem } from '@/types/trip-wishes';

describe('buildWishCategoryDistribution', () => {
  it('computes percent by category', () => {
    const mine = [
      { id: '1', category: 'activities' },
      { id: '2', category: 'activities' },
      { id: '3', category: 'dining' },
    ] as TripWishItem[];

    const slices = buildWishCategoryDistribution(mine, []);
    expect(slices).toHaveLength(2);
    expect(slices[0].category).toBe('activities');
    expect(slices[0].percent).toBe(67);
    expect(slices[1].percent).toBe(33);
  });

  it('returns empty when no wishes', () => {
    expect(buildWishCategoryDistribution([], [])).toEqual([]);
  });
});
