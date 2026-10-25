import { describe, expect, it } from 'vitest';
import {
  buildOverallReadinessReportPath,
  resolveOverallReadinessActionHref,
} from './overall-readiness-navigation.util';

describe('overall-readiness-navigation.util', () => {
  const tripId = 'trip-abc';

  it('builds report path', () => {
    expect(buildOverallReadinessReportPath(tripId)).toBe(
      '/dashboard/trips/trip-abc/overall-readiness',
    );
  });

  it('maps accommodation / members / decision action codes', () => {
    expect(
      resolveOverallReadinessActionHref(tripId, { actionCode: 'OPEN_ACCOMMODATION_TAB' }),
    ).toContain('tab=bookings');
    expect(
      resolveOverallReadinessActionHref(tripId, { actionCode: 'INVITE_MEMBER_CONFIRM' }),
    ).toContain('tab=members');
    expect(
      resolveOverallReadinessActionHref(tripId, { actionCode: 'CONFIRM_RENTAL_INSURANCE' }),
    ).toContain('decisionSpace=1');
  });

  it('falls back to report for unknown codes', () => {
    expect(resolveOverallReadinessActionHref(tripId, { actionCode: 'UNKNOWN_X' })).toBe(
      buildOverallReadinessReportPath(tripId),
    );
  });
});
