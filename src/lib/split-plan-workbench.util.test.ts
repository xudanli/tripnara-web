import { describe, expect, it } from 'vitest';
import {
  countTripItineraryItems,
  filterDaySplitsForPlan,
  hasPendingSplitPreview,
  hasTeamFitSplitConflict,
  isSplitPlanSnapshotStale,
  isWorkbenchSplitPlanEligible,
  resolveEffectiveDaySplits,
  resolveWorkbenchSplitPlanContext,
  shouldShowSplitPlanBanner,
  splitPlanAffectedDayIndexes,
} from './split-plan-workbench.util';
import type { PlanningDaySplitDto } from '@/types/planning-day-split';
import type { TripDetail } from '@/types/trip';
import type { DecisionCheckerSplitPlanDto } from '@/types/decision-checker';

describe('split-plan-workbench.util', () => {
  it('filterDaySplitsForPlan matches splitPlanId', () => {
    const splits = [
      { id: '1', splitPlanId: 'sp_a', dayIndex: 2 } as PlanningDaySplitDto,
      { id: '2', splitPlanId: 'sp_b', dayIndex: 2 } as PlanningDaySplitDto,
    ];
    expect(filterDaySplitsForPlan(splits, 'sp_a')).toHaveLength(1);
    expect(filterDaySplitsForPlan(splits, undefined)).toEqual(splits);
  });

  it('splitPlanAffectedDayIndexes converts 1-based days', () => {
    expect([...splitPlanAffectedDayIndexes([3, 5])]).toEqual([2, 4]);
  });

  it('shouldShowSplitPlanBanner requires banner content', () => {
    expect(shouldShowSplitPlanBanner(undefined)).toBe(false);
    expect(shouldShowSplitPlanBanner({ id: 'x', banner: { title: 't', message: '', affectedDays: [] } } as never)).toBe(false);
    expect(
      shouldShowSplitPlanBanner(
        { id: 'x', banner: { title: 't', message: '', affectedDays: [] } } as never,
        [{ id: '1', splitPlanId: 'x', dayIndex: 0 } as PlanningDaySplitDto],
      ),
    ).toBe(true);
  });

  it('hasPendingSplitPreview reflects daySplits length', () => {
    expect(hasPendingSplitPreview([])).toBe(false);
    expect(hasPendingSplitPreview([{ id: '1' } as PlanningDaySplitDto])).toBe(true);
  });

  it('isSplitPlanSnapshotStale detects mismatch', () => {
    expect(
      isSplitPlanSnapshotStale(
        { snapshotVersion: 'a' } as never,
        'b',
      ),
    ).toBe(true);
  });

  it('resolveWorkbenchSplitPlanContext drops BFF data without schedule or team_fit', () => {
    const rawSplitPlan = { id: 'sp1' } as DecisionCheckerSplitPlanDto;
    const rawDaySplits = [{ id: '1', splitPlanId: 'sp1', dayIndex: 0 } as PlanningDaySplitDto];
    const tripWithItems = {
      TripDay: [{ ItineraryItem: [{ id: 'item-1' }] }],
    } as TripDetail;

    expect(
      resolveWorkbenchSplitPlanContext({
        trip: tripWithItems,
        conflictItems: [{ category: 'schedule' }],
        rawSplitPlan,
        rawDaySplits,
      }),
    ).toEqual({ eligible: false, splitPlan: undefined, daySplits: [] });

    expect(
      resolveWorkbenchSplitPlanContext({
        trip: { TripDay: [] } as TripDetail,
        conflictItems: [{ category: 'team_fit' }],
        rawSplitPlan,
        rawDaySplits,
      }),
    ).toEqual({ eligible: false, splitPlan: undefined, daySplits: [] });
  });

  it('resolveWorkbenchSplitPlanContext passes through BFF when eligible', () => {
    const rawSplitPlan = { id: 'sp1' } as DecisionCheckerSplitPlanDto;
    const rawDaySplits = [
      { id: '1', splitPlanId: 'sp1', dayIndex: 0 } as PlanningDaySplitDto,
      { id: '2', splitPlanId: 'other', dayIndex: 1 } as PlanningDaySplitDto,
    ];
    const tripWithItems = {
      TripDay: [{ ItineraryItem: [{ id: 'item-1' }] }],
    } as TripDetail;

    const ctx = resolveWorkbenchSplitPlanContext({
      trip: tripWithItems,
      conflictItems: [{ category: 'team_fit' }],
      rawSplitPlan,
      rawDaySplits,
    });

    expect(ctx.eligible).toBe(true);
    expect(ctx.splitPlan).toBe(rawSplitPlan);
    expect(ctx.daySplits).toHaveLength(1);
    expect(isWorkbenchSplitPlanEligible({ trip: tripWithItems, conflictItems: [{ category: 'team_fit' }] })).toBe(
      true,
    );
    expect(countTripItineraryItems(tripWithItems)).toBe(1);
    expect(hasTeamFitSplitConflict([{ category: 'team_fit' }])).toBe(true);
  });

  it('resolveEffectiveDaySplits prefers decisionChecker over planning-conflicts', () => {
    const fromConflicts = [
      { id: '1', splitPlanId: 'sp1', dayNumber: 1, dayIndex: 0 } as PlanningDaySplitDto,
    ];
    const fromDc = [
      {
        id: '2',
        splitPlanId: 'sp1',
        dayNumber: 1,
        dayIndex: 0,
        rejoin: { id: 'rj', title: '黑沙滩套房酒店', startTime: '16:14', kind: 'rejoin' },
        stats: { meetupTime: '20:49' },
      } as PlanningDaySplitDto,
    ];

    const result = resolveEffectiveDaySplits({
      planningConflictsDaySplits: fromConflicts,
      decisionCheckerDaySplits: fromDc,
      splitPlanId: 'sp1',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('2');
    expect(result[0]?.stats?.meetupTime).toBe('20:49');
    expect(result[0]?.rejoin?.title).toBe('黑沙滩套房酒店');
  });

  it('resolveEffectiveDaySplits keeps first packet before poll ready', () => {
    const fromConflicts = [
      { id: '1', splitPlanId: 'sp1', dayNumber: 1, dayIndex: 0 } as PlanningDaySplitDto,
    ];
    const result = resolveEffectiveDaySplits({
      planningConflictsDaySplits: fromConflicts,
      decisionCheckerDaySplits: undefined,
      splitPlanId: 'sp1',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('1');
  });

  it('resolveWorkbenchSplitPlanContext passes daySplits before splitPlan is ready', () => {
    const fromConflicts = [
      {
        id: '1',
        splitPlanId: 'sp1',
        dayNumber: 1,
        branches: [{ id: 'a' }, { id: 'b' }],
      } as PlanningDaySplitDto,
    ];
    const tripWithItems = {
      TripDay: [{ ItineraryItem: [{ id: 'item-1' }] }],
    } as TripDetail;

    const ctx = resolveWorkbenchSplitPlanContext({
      trip: tripWithItems,
      conflictItems: [{ category: 'team_fit' }],
      planningConflictsDaySplits: fromConflicts,
    });

    expect(ctx.eligible).toBe(true);
    expect(ctx.splitPlan).toBeUndefined();
    expect(ctx.daySplits).toHaveLength(1);
  });
});
