import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  DECISION_STRIP_ANALYTICS_EVENTS,
  trackDecisionStripDeepLink,
} from '@/utils/plan-studio-decision-strip-analytics';

describe('plan-studio-decision-strip-analytics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks deep link targets in dev console', () => {
    trackDecisionStripDeepLink({
      tripId: 'trip-1',
      target: 'decision_cockpit',
      stripState: 'conclusion',
    });

    expect(console.log).toHaveBeenCalledWith(
      '[DecisionStripAnalytics]',
      DECISION_STRIP_ANALYTICS_EVENTS.DEEP_LINK,
      expect.objectContaining({
        trip_id: 'trip-1',
        target: 'decision_cockpit',
        strip_state: 'conclusion',
      }),
    );
  });
});
