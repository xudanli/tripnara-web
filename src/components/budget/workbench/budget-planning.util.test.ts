import { describe, expect, it } from 'vitest';
import { buildHotspots, hasMeaningfulBudgetActuals } from '@/components/budget/workbench/budget-planning.util';
import type { BudgetActualLineItem, TripBudgetProfile } from '@/types/trip-budget';

describe('buildHotspots share thresholds', () => {
  const profile: TripBudgetProfile = {
    tripId: 't1',
    intent: { total: 32500, currency: 'CNY', source: 'user', setAt: '' },
    structure: null,
    actuals: {
      totalEstimated: 100,
      totalActual: 0,
      currency: 'CNY',
      categoryBreakdown: {
        transportation: 100,
        accommodation: 0,
        experience: 0,
        food: 0,
        other: 0,
      },
      unpaidCount: 0,
    },
    updatedAt: '',
  };

  const taxiLine: BudgetActualLineItem = {
    id: 'item-1',
    name: '打车',
    estimated: 100,
    currency: 'CNY',
    source: 'itinerary',
  };

  it('does not flag single item when total fill is below 5% of L1', () => {
    expect(hasMeaningfulBudgetActuals(32500, 100)).toBe(false);
    const hotspots = buildHotspots(profile, [], [taxiLine], true);
    expect(hotspots).toHaveLength(0);
  });

  it('flags single item when share of intent is meaningful', () => {
    const richProfile: TripBudgetProfile = {
      ...profile,
      actuals: {
        ...profile.actuals!,
        totalEstimated: 8000,
      },
    };
    const bigItem: BudgetActualLineItem = {
      ...taxiLine,
      estimated: 3000,
    };
    const hotspots = buildHotspots(richProfile, [], [bigItem], true);
    expect(hotspots.some((h) => h.name === '打车')).toBe(true);
  });
});
