import { describe, expect, it } from 'vitest';
import {
  extractItineraryDiffFromDecisionPreview,
  resolveScheduleNavigationFromDecisionPreview,
} from './decision-space-itinerary-diff.util';

describe('decision-space-itinerary-diff.util', () => {
  it('extracts itinerary diff from repairPreview', () => {
    const diff = extractItineraryDiffFromDecisionPreview({
      optionId: 'opt_a',
      repairPreview: {
        itineraryDiff: [
          {
            slotId: 'item-42',
            changeType: 'time_changed',
            dayNumber: 3,
            before: { title: '蓝湖', time: '10:00' },
            after: { title: '蓝湖', time: '14:00' },
          },
        ],
      },
    });
    expect(diff).toHaveLength(1);
    expect(diff[0]?.slotId).toBe('item-42');
    expect(diff[0]?.changeType).toBe('time_changed');
  });

  it('resolves schedule navigation from diff rows', () => {
    const navigation = resolveScheduleNavigationFromDecisionPreview({
      itineraryDiff: [
        {
          slotId: 'item-42',
          changeType: 'removed',
          dayNumber: 2,
          before: { title: '蓝湖' },
        },
      ],
    });
    expect(navigation?.dayNumber).toBe(2);
    expect(navigation?.highlightItemIds).toEqual(['item-42']);
  });

  it('falls back to repairPreview snapshots when diff is empty', () => {
    const navigation = resolveScheduleNavigationFromDecisionPreview({
      preview: {
        optionId: 'opt_a',
        repairPreview: {
          after: { dayNumber: 4, highlights: ['item-99'] },
        },
      },
      itineraryDiff: [],
    });
    expect(navigation?.dayNumber).toBe(4);
    expect(navigation?.highlightItemIds).toEqual(['item-99']);
  });
});
