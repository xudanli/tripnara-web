import { describe, expect, it } from 'vitest';
import {
  buildWorkbenchPlanningContextNarrative,
  buildWorkbenchPlanningContextSections,
} from '@/lib/workbench-planning-context.util';
import type { TripDetail } from '@/types/trip';

const trip: TripDetail = {
  id: 'trip_1',
  destination: '冰岛',
  startDate: '2026-07-20T00:00:00.000Z',
  endDate: '2026-07-29T00:00:00.000Z',
  travelers: [{ type: 'ADULT' }, { type: 'ADULT' }],
} as TripDetail;

describe('workbench-planning-context.util', () => {
  it('builds trip, team, budget and wish sections', () => {
    const sections = buildWorkbenchPlanningContextSections({
      trip,
      budgetProfile: {
        tripId: 'trip_1',
        intent: { total: 120000, currency: 'CNY', source: 'user', setAt: '2026-01-01' },
        structure: null,
        updatedAt: '2026-01-01',
      },
      wishSummary: {
        privateCount: 1,
        mineCount: 2,
        teamCount: 3,
        agentEligibleCount: 2,
        impactByDay: [],
      },
      collaborators: [
        { id: 'c1', tripId: 'trip_1', userId: 'u1', displayName: 'Alice', role: 'OWNER', createdAt: '' },
      ],
    });

    expect(sections.map((section) => section.id)).toEqual(['trip', 'team', 'budget', 'wishes']);
    expect(sections[0]?.lines[0]).toContain('冰岛');
    expect(sections[2]?.lines[0]).toContain('120');
    expect(sections[3]?.lines[0]).toContain('团队心愿 3 条');
  });

  it('builds narrative from section lines', () => {
    const sections = buildWorkbenchPlanningContextSections({ trip });
    const narrative = buildWorkbenchPlanningContextNarrative(sections);
    expect(narrative).toContain('冰岛');
    expect(narrative.endsWith('。')).toBe(true);
  });
});
