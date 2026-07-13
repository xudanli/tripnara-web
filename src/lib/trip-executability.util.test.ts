import { describe, expect, it } from 'vitest';
import {
  canConfirmTripWithExecutability,
  isIcelandDestination,
  resolveVulnerableDayIndex,
  shouldShowSelfDriveExecutability,
  sortFindingsBySeverity,
} from '@/lib/trip-executability.util';
import type { ConstraintsSummaryResponse } from '@/types/planning-constraints';
import type { DailyDrivePlan, ValidationFinding } from '@/types/trip-executability';

function makeConstraintsSummary(scope?: string): ConstraintsSummaryResponse {
  return {
    tripId: 'trip-1',
    constraintsVersion: 1,
    confirmedAt: null,
    confirmedBy: null,
    isUserConfirmed: false,
    isVersionConfirmed: false,
    allReady: true,
    pendingCount: 0,
    timeRange: {
      startDate: '2026-07-15',
      endDate: '2026-07-20',
      dayCount: 6,
      status: 'confirmed',
    },
    budget: {
      total: 10000,
      currency: 'CNY',
      gateStatus: 'ALLOW',
      status: 'confirmed',
    },
    travelers: {
      count: 2,
      memberCount: 2,
      profilingCompletedCount: 2,
      status: 'confirmed',
    },
    transport: {
      travelMode: 'DRIVING',
      transportHint: null,
      sampleTravelMode: null,
      sampleDistanceMeters: null,
      status: 'confirmed',
      scope,
    },
    pendingItems: [],
  };
}

describe('trip-executability.util', () => {
  it('detects iceland destinations', () => {
    expect(isIcelandDestination('IS')).toBe(true);
    expect(isIcelandDestination('冰岛南岸')).toBe(true);
    expect(isIcelandDestination('JP')).toBe(false);
  });

  it('shows TEP only for iceland self_drive_only scope', () => {
    expect(
      shouldShowSelfDriveExecutability('IS', makeConstraintsSummary('self_drive_only')),
    ).toBe(true);
    expect(
      shouldShowSelfDriveExecutability('IS', makeConstraintsSummary('mixed')),
    ).toBe(false);
    expect(
      shouldShowSelfDriveExecutability('JP', makeConstraintsSummary('self_drive_only')),
    ).toBe(false);
  });

  it('sorts findings by severity descending', () => {
    const findings: ValidationFinding[] = [
      {
        findingId: 'a',
        ruleId: 'SDR-101',
        outcome: 'CAUTION',
        severity: 'LOW',
        message: 'low',
        affectedRefs: [],
      },
      {
        findingId: 'b',
        ruleId: 'SDR-101',
        outcome: 'SUGGEST_REPAIR',
        severity: 'HIGH',
        message: 'high',
        affectedRefs: [],
      },
    ];
    expect(sortFindingsBySeverity(findings).map((f) => f.findingId)).toEqual(['b', 'a']);
  });

  it('picks the most severe day as vulnerable', () => {
    const findings: ValidationFinding[] = [
      {
        findingId: 'd3',
        ruleId: 'SDR-101',
        outcome: 'SUGGEST_REPAIR',
        severity: 'HIGH',
        message: 'Day 3 heavy',
        affectedRefs: ['day_3'],
      },
      {
        findingId: 'd4',
        ruleId: 'SDR-102',
        outcome: 'CAUTION',
        severity: 'MEDIUM',
        message: 'Day 4 caution',
        affectedRefs: ['day_4'],
      },
    ];
    const plans: DailyDrivePlan[] = [
      {
        date: '2026-07-15',
        dayIndex: 3,
        origin: { ref: 'o', label: 'A' },
        destination: { ref: 'd', label: 'B' },
        legs: [{ legId: 'l1', baseNavigationMinutes: 200, roadRefs: [] }],
        activities: [],
      },
    ];
    expect(resolveVulnerableDayIndex(findings, plans)).toBe(3);
  });

  it('requires executability canCommit and confirmed constraints for trip confirm', () => {
    const executability = {
      ui: { canCommit: true, statusLabel: '可以出发', stripLevel: 'success' as const, status: 'EXECUTABLE' as const },
    } as Parameters<typeof canConfirmTripWithExecutability>[0];

    expect(
      canConfirmTripWithExecutability(executability, {
        allReady: true,
        isUserConfirmed: true,
        isVersionConfirmed: true,
      }),
    ).toBe(true);

    expect(
      canConfirmTripWithExecutability(executability, {
        allReady: false,
        isUserConfirmed: true,
        isVersionConfirmed: true,
      }),
    ).toBe(false);

    expect(
      canConfirmTripWithExecutability(
        { ...executability, ui: { ...executability!.ui, canCommit: false } },
        {
          allReady: true,
          isUserConfirmed: true,
          isVersionConfirmed: true,
        },
      ),
    ).toBe(false);

    expect(
      canConfirmTripWithExecutability(executability, {
        allReady: true,
        isUserConfirmed: false,
        needsReconfirm: true,
      }),
    ).toBe(false);
  });
});
