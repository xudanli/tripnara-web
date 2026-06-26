import { describe, expect, it } from 'vitest';
import { resolveLoopChecklistNavigateTarget } from '@/lib/loop-checklist-navigation';
import type { TripLoopChecklistItem } from '@/types/trip-loop';

function item(partial: Partial<TripLoopChecklistItem>): TripLoopChecklistItem {
  return {
    id: 'schedule',
    label: '日程',
    result: 'pending',
    ...partial,
  };
}

describe('resolveLoopChecklistNavigateTarget', () => {
  it('does not navigate for deferred weather', () => {
    expect(
      resolveLoopChecklistNavigateTarget(
        item({ id: 'weather', result: 'deferred', detail: '出发前 7 天复查' }),
      ).kind,
    ).toBe('info_only');
  });

  it('opens profiling for team_fit pending', () => {
    const target = resolveLoopChecklistNavigateTarget(
      item({ id: 'team_fit', label: '团队适配', detail: '1/2 成员完成画像' }),
    );
    expect(target.kind).toBe('open_profiling');
    expect(target.profilingSurface).toBe('quiz');
  });

  it('filters schedule issues for transport pending', () => {
    const target = resolveLoopChecklistNavigateTarget(item({ id: 'transport', result: 'pending' }));
    expect(target).toEqual({ kind: 'filter_issues', category: 'transport' });
  });
});
