import { describe, expect, it } from 'vitest';
import type { ScoreFinding } from '@/api/readiness';
import {
  mapReadinessFindingPriority,
  mapTravelTimingPriority,
  mapConflictPriority,
  resolveFindingPriority,
  mapRiskPriority,
  resolveVerdictFromSummary,
} from '@/lib/feasibility-issue-priority';

function finding(partial: Partial<ScoreFinding> & Pick<ScoreFinding, 'id'>): ScoreFinding {
  return {
    type: 'must',
    category: 'schedule',
    message: 'test',
    severity: 'medium',
    ...partial,
  };
}

describe('mapReadinessFindingPriority', () => {
  it('maps readiness types per product table', () => {
    expect(mapReadinessFindingPriority(finding({ id: '1', type: 'blocker' }))).toBe('must_handle');
    expect(mapReadinessFindingPriority(finding({ id: '2', type: 'must' }))).toBe('suggest_adjust');
    expect(mapReadinessFindingPriority(finding({ id: '3', type: 'warning' }))).toBe('suggest_adjust');
    expect(mapReadinessFindingPriority(finding({ id: '4', type: 'should' }))).toBe('pending_confirm');
    expect(mapReadinessFindingPriority(finding({ id: '5', type: 'suggestion' }))).toBe(
      'pending_confirm',
    );
  });

  it('does not upgrade from severity alone', () => {
    expect(
      mapReadinessFindingPriority(
        finding({ id: '6', type: 'must', severity: 'high', category: 'evidence' }),
      ),
    ).toBe('suggest_adjust');
  });
});

describe('mapConflictPriority', () => {
  it('maps conflict types and severity', () => {
    expect(mapConflictPriority({ conflictType: 'CLOSURE_RISK' })).toBe('must_handle');
    expect(mapConflictPriority({ conflictType: 'TRANSPORT_INSUFFICIENT' })).toBe('must_handle');
    expect(mapConflictPriority({ conflictType: 'TIME_CONFLICT', severity: 'HIGH' })).toBe(
      'must_handle',
    );
    expect(mapConflictPriority({ conflictType: 'BUFFER_INSUFFICIENT', severity: 'MEDIUM' })).toBe(
      'suggest_adjust',
    );
  });

  it('maps enforced hard constraint issue kinds to must_handle', () => {
    expect(mapConflictPriority({ issueKind: 'daily_drive' })).toBe('must_handle');
    expect(mapConflictPriority({ issueKind: 'no_night_drive' })).toBe('must_handle');
    expect(mapConflictPriority({ issueKind: 'budget' })).toBe('must_handle');
  });

  it('maps travel timing signals', () => {
    expect(
      mapTravelTimingPriority({ isStartTooEarly: true } as Parameters<
        typeof mapTravelTimingPriority
      >[0]),
    ).toBe('must_handle');
    expect(
      mapTravelTimingPriority({ gapMinutes: 20 } as Parameters<typeof mapTravelTimingPriority>[0]),
    ).toBe('suggest_adjust');
    expect(
      mapTravelTimingPriority({
        timingSource: 'missing_times',
      } as Parameters<typeof mapTravelTimingPriority>[0]),
    ).toBe('pending_confirm');
  });
});

describe('resolveFindingPriority', () => {
  it('uses explicit priority when provided', () => {
    expect(
      resolveFindingPriority(
        finding({ id: '7', type: 'blocker', priority: 'pending_confirm' }),
      ),
    ).toBe('pending_confirm');
  });

  it('upgrades must finding when conflict timing is too early', () => {
    expect(
      resolveFindingPriority(
        finding({
          id: '8',
          type: 'must',
          issueKind: 'inter_day_travel',
          anchors: {
            fromItemId: 'a',
            toItemId: 'b',
            fromDayNumber: 1,
            toDayNumber: 2,
            fromPlaceLabel: 'A',
            toPlaceLabel: 'B',
            travelMinutes: 60,
            isStartTooEarly: true,
          },
        }),
      ),
    ).toBe('must_handle');
  });
});

describe('mapRiskPriority', () => {
  it('never maps high severity alone to must_handle', () => {
    expect(
      mapRiskPriority({
        id: 'r1',
        type: 'weather',
        severity: 'high',
        message: 'storm',
      }),
    ).toBe('suggest_adjust');
    expect(
      mapRiskPriority({
        id: 'r2',
        type: 'weather',
        severity: 'low',
        message: 'uncertain',
      }),
    ).toBe('pending_confirm');
  });
});

describe('resolveVerdictFromSummary', () => {
  it('gates verdict from issue priority counts', () => {
    expect(
      resolveVerdictFromSummary(
        { mustHandle: 1, suggestAdjust: 0, pendingConfirm: 0 },
        { hasValidatedReport: true },
      ).status,
    ).toBe('NOT_EXECUTABLE');
    expect(
      resolveVerdictFromSummary(
        { mustHandle: 0, suggestAdjust: 2, pendingConfirm: 0 },
        { hasValidatedReport: true },
      ).status,
    ).toBe('ADJUST_REQUIRED');
    expect(
      resolveVerdictFromSummary(
        { mustHandle: 0, suggestAdjust: 0, pendingConfirm: 1 },
        { hasValidatedReport: true },
      ).status,
    ).toBe('ADJUST_REQUIRED');
    expect(
      resolveVerdictFromSummary(
        { mustHandle: 0, suggestAdjust: 0, pendingConfirm: 0 },
        { hasValidatedReport: true },
      ).status,
    ).toBe('EXECUTABLE');
  });
});
