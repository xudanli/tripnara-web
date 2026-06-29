import { describe, expect, it } from 'vitest';
import {
  PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS,
  isPlanningConflictsBffSlowLoading,
  shouldUsePlanningConflictsLegacyFallback,
} from '@/lib/planning-conflicts-fallback.util';

describe('planning-conflicts-fallback.util', () => {
  it('detects missing BFF endpoint', () => {
    expect(shouldUsePlanningConflictsLegacyFallback({ code: 'NOT_FOUND' })).toBe(true);
    expect(shouldUsePlanningConflictsLegacyFallback({ response: { status: 404 } })).toBe(true);
  });

  it('detects timeout and server errors', () => {
    expect(shouldUsePlanningConflictsLegacyFallback({ code: 'ECONNABORTED' })).toBe(true);
    expect(shouldUsePlanningConflictsLegacyFallback(new Error('请求超时（已等待 60 秒）'))).toBe(true);
    expect(shouldUsePlanningConflictsLegacyFallback({ response: { status: 500 } })).toBe(true);
  });

  it('ignores client errors', () => {
    expect(shouldUsePlanningConflictsLegacyFallback({ response: { status: 400 } })).toBe(false);
    expect(shouldUsePlanningConflictsLegacyFallback(null)).toBe(false);
  });

  it('detects slow BFF loading', () => {
    const started = 1_000;
    expect(
      isPlanningConflictsBffSlowLoading(
        true,
        started,
        started + PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS,
      ),
    ).toBe(true);
    expect(isPlanningConflictsBffSlowLoading(true, started, started + 1000)).toBe(false);
    expect(isPlanningConflictsBffSlowLoading(false, started, started + 60_000)).toBe(false);
  });
});
