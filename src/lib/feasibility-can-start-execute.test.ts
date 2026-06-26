import { describe, expect, it } from 'vitest';
import { computeCanStartExecute } from '@/lib/feasibility-can-start-execute';
import type { TripFeasibilityReportDto } from '@/types/trip-feasibility-report';

function baseReport(overrides: Partial<TripFeasibilityReportDto> = {}): TripFeasibilityReportDto {
  return {
    tripId: 't1',
    tripTitle: 'Test',
    dateRangeLabel: 'Jan 1–3',
    verdict: { status: 'EXECUTABLE', headline: 'ok' },
    overallScore: 90,
    verifiedAt: '2026-01-01T00:00:00Z',
    isStale: false,
    dimensions: [],
    dayTimeline: [],
    issues: [],
    alternatives: [],
    summary: { mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0, blockers: 0 },
    ...overrides,
  };
}

describe('computeCanStartExecute', () => {
  it('uses backend flag when present', () => {
    expect(computeCanStartExecute(baseReport({ canStartExecute: false }))).toBe(false);
  });

  it('requires verified, fresh, executable, no must_handle', () => {
    expect(computeCanStartExecute(baseReport())).toBe(true);
    expect(computeCanStartExecute(baseReport({ verifiedAt: undefined }))).toBe(false);
    expect(computeCanStartExecute(baseReport({ isStale: true }))).toBe(false);
    expect(
      computeCanStartExecute(baseReport({ verdict: { status: 'ADJUST_REQUIRED', headline: '' } })),
    ).toBe(false);
    expect(
      computeCanStartExecute(
        baseReport({ summary: { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0, blockers: 1 } }),
      ),
    ).toBe(false);
  });
});
