import { describe, expect, it } from 'vitest';
import { IntentTravelMode } from '@/types/trip';
import type { TripDetail } from '@/types/trip';
import {
  buildPlanningConstraintsSummary,
  enrichConstraintsSummaryFromLocal,
  inferTravelModeFromTransportHint,
  isTransportModeAligned,
  mapConstraintsSummaryFromBff,
  nextConstraintsMetadataAfterChange,
  normalizeConstraintFieldStatus,
  parseConstraintDeepLink,
  resolveTravelerCount,
} from '@/lib/planning-constraints.util';

function trip(partial: Partial<TripDetail>): TripDetail {
  return partial as TripDetail;
}

describe('planning-constraints.util', () => {
  it('marks budget need_confirm from gateStatus', () => {
    const summary = buildPlanningConstraintsSummary({
      trip: trip({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-05T00:00:00.000Z',
        TripDay: [{ id: 'd1' } as TripDetail['TripDay'][0]],
        budgetConfig: { totalBudget: 50000, currency: 'CNY' },
        pacingConfig: { travelers: [{ type: 'ADULT', mobilityTag: 'IRON_LEGS' }] },
      }),
      budgetProfile: {
        tripId: 't1',
        intent: { total: 50000, currency: 'CNY', source: 'user', setAt: '' },
        structure: null,
        gateStatus: { verdict: 'NEED_CONFIRM' },
        updatedAt: '',
      },
      collaboratorCount: 1,
    });
    expect(summary.budget.status).toBe('need_confirm');
    expect(summary.pendingItems.some((p) => p.key === 'budget')).toBe(true);
  });

  it('flags traveler misalignment', () => {
    const summary = buildPlanningConstraintsSummary({
      trip: trip({
        pacingConfig: {
          travelers: [
            { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
            { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
          ],
        },
      }),
      collaboratorCount: 4,
    });
    expect(summary.travelers.status).toBe('misaligned');
  });

  it('bumps constraints version and clears confirm on change', () => {
    const base = trip({
      metadata: {
        constraintsVersion: 2,
        constraintsConfirmedAt: '2026-06-01T00:00:00.000Z',
      },
    });
    const next = nextConstraintsMetadataAfterChange(base);
    expect(next.constraintsVersion).toBe(3);
    expect(next.constraintsConfirmedAt).toBeUndefined();
  });

  it('aligns driving intent with driving segment', () => {
    expect(isTransportModeAligned(IntentTravelMode.DRIVING, 'DRIVING')).toBe(true);
    expect(isTransportModeAligned(IntentTravelMode.DRIVING, 'WALKING')).toBe(false);
  });

  it('resolveTravelerCount prefers pacingConfig', () => {
    expect(
      resolveTravelerCount(
        trip({
          pacingConfig: { travelers: [{ type: 'ADULT', mobilityTag: 'IRON_LEGS' }] },
          budgetConfig: {
            totalBudget: 1,
            currency: 'CNY',
            travelers: [
              { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
              { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
            ],
          },
        }),
      ),
    ).toBe(1);
  });

  it('maps BFF deepLink to editTab', () => {
    const mapped = mapConstraintsSummaryFromBff({
      tripId: 't1',
      constraintsVersion: 1,
      confirmedAt: null,
      confirmedBy: null,
      isUserConfirmed: false,
      allReady: false,
      pendingCount: 1,
      timeRange: {
        startDate: null,
        endDate: null,
        dayCount: 0,
        status: 'missing',
      },
      budget: { total: null, currency: 'CNY', gateStatus: null, status: 'missing' },
      travelers: { count: 0, memberCount: 0, profilingCompletedCount: 0, status: 'missing' },
      transport: {
        travelMode: null,
        transportHint: null,
        sampleTravelMode: null,
        sampleDistanceMeters: null,
        status: 'missing',
      },
      pendingItems: [
        { key: 'budget', status: 'missing', label: '设置总预算', deepLink: 'tab=budget' },
      ],
    });
    expect(mapped.pendingItems[0].openBudgetDialog).toBe(true);
  });

  it('parseConstraintDeepLink handles openIntent and openBudget', () => {
    expect(parseConstraintDeepLink('openIntent=1')).toEqual({ openIntent: true });
    expect(parseConstraintDeepLink('openBudget=1')).toEqual({ openBudgetDialog: true });
    expect(parseConstraintDeepLink('tab=budget')).toEqual({ openBudgetDialog: true });
  });

  it('normalizeConstraintFieldStatus maps aligned to confirmed', () => {
    expect(normalizeConstraintFieldStatus('aligned')).toBe('confirmed');
  });

  it('inferTravelModeFromTransportHint maps car to DRIVING', () => {
    expect(inferTravelModeFromTransportHint('car')).toBe('DRIVING');
  });

  it('resolveBudget prefers profile then budgetConfig.total', () => {
    const summary = buildPlanningConstraintsSummary({
      trip: trip({
        budgetConfig: { total: 55000, currency: 'CNY', totalBudget: 50000 },
      }),
      budgetProfile: {
        tripId: 't1',
        intent: { total: 60000, currency: 'CNY', source: 'user', setAt: '' },
        structure: null,
        gateStatus: null,
        updatedAt: '',
      },
    });
    expect(summary.budget.total).toBe(60000);
  });

  it('enrichConstraintsSummaryFromLocal fills BFF missing budget from profile', () => {
    const remote = mapConstraintsSummaryFromBff({
      tripId: 't1',
      constraintsVersion: 1,
      confirmedAt: null,
      confirmedBy: null,
      isUserConfirmed: false,
      allReady: false,
      pendingCount: 1,
      timeRange: {
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-05T00:00:00.000Z',
        dayCount: 5,
        status: 'confirmed',
      },
      budget: { total: null, currency: 'CNY', gateStatus: null, status: 'missing' },
      travelers: { count: 2, memberCount: 2, profilingCompletedCount: 1, status: 'confirmed' },
      transport: {
        travelMode: 'MIXED',
        transportHint: null,
        sampleTravelMode: null,
        sampleDistanceMeters: null,
        status: 'confirmed',
      },
      pendingItems: [
        { key: 'budget', status: 'missing', label: '设置总预算', deepLink: 'tab=budget' },
      ],
    });
    const local = buildPlanningConstraintsSummary({
      trip: trip({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-05T00:00:00.000Z',
        TripDay: [{ id: 'd1' } as TripDetail['TripDay'][0]],
        pacingConfig: {
          travelers: [
            { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
            { type: 'ADULT', mobilityTag: 'IRON_LEGS' },
          ],
          travelMode: IntentTravelMode.MIXED,
        },
      }),
      budgetProfile: {
        tripId: 't1',
        intent: { total: 60000, currency: 'CNY', source: 'user', setAt: '' },
        structure: null,
        gateStatus: null,
        updatedAt: '',
      },
      collaboratorCount: 2,
    });
    const merged = enrichConstraintsSummaryFromLocal(remote, local);
    expect(merged.budget.total).toBe(60000);
    expect(merged.budget.status).toBe('confirmed');
    expect(merged.pendingItems.some((p) => p.key === 'budget')).toBe(false);
    expect(merged.allReady).toBe(true);
  });

  it('sets needsReconfirm when version outpaces confirmed snapshot', () => {
    const summary = buildPlanningConstraintsSummary({
      trip: trip({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-05T00:00:00.000Z',
        TripDay: [{ id: 'd1' } as TripDetail['TripDay'][0]],
        budgetConfig: { totalBudget: 50000, currency: 'CNY' },
        pacingConfig: {
          travelers: [{ type: 'ADULT', mobilityTag: 'IRON_LEGS' }],
          travelMode: IntentTravelMode.DRIVING,
        },
        metadata: {
          constraintsVersion: 3,
          constraintsConfirmedVersion: 2,
          constraintsConfirmedAt: '2026-06-01T00:00:00.000Z',
        },
      }),
      budgetProfile: {
        tripId: 't1',
        intent: { total: 50000, currency: 'CNY', source: 'user', setAt: '' },
        structure: null,
        gateStatus: { verdict: 'ALLOW' },
        updatedAt: '',
      },
      collaboratorCount: 1,
      intentTravelMode: IntentTravelMode.DRIVING,
    });
    expect(summary.isUserConfirmed).toBe(false);
    expect(summary.needsReconfirm).toBe(true);
    expect(summary.allReady).toBe(true);
  });
});
