import { describe, expect, it } from 'vitest';
import {
  looksLikeTripPlanningRequest,
  looksLikeTripReviewRequest,
  resolveBoundTripRouteIntentMode,
} from '@/lib/route-run-intent-heuristics';

describe('looksLikeTripReviewRequest', () => {
  it('matches 可行性 / 改进建议 / 行程体检', () => {
    expect(looksLikeTripReviewRequest('分析当前行程的整体可行性，有什么需要改进的吗？')).toBe(true);
    expect(looksLikeTripReviewRequest('基于当前行程，给我几条可执行的改进建议')).toBe(true);
    expect(looksLikeTripReviewRequest('帮我做一次行程体检，检查风险、节奏和待改进点')).toBe(true);
    expect(looksLikeTripReviewRequest('检查当前行程的准备度，有哪些风险或待办事项？')).toBe(true);
  });
});

describe('resolveBoundTripRouteIntentMode', () => {
  const tripId = 'trip_15c50a69931845ca';

  it('without trip_id keeps effective mode (cannot analyze current trip)', () => {
    expect(resolveBoundTripRouteIntentMode(null, 'auto', '分析可行性')).toBe('auto');
  });

  it('trip review → data_lookup, not TRIP_PLANNING', () => {
    expect(
      resolveBoundTripRouteIntentMode(
        tripId,
        'auto',
        '分析当前行程的整体可行性，有什么需要改进的吗？'
      )
    ).toBe('data_lookup');
    expect(
      resolveBoundTripRouteIntentMode(tripId, 'auto', '帮我做一次行程体检，检查风险、节奏和待改进点')
    ).toBe('data_lookup');
  });

  it('prefers review over planning when phrasing overlaps', () => {
    const msg = '帮我全面分析当前行程，看看还有什么问题或可以优化的地方';
    expect(looksLikeTripReviewRequest(msg)).toBe(true);
    expect(resolveBoundTripRouteIntentMode(tripId, 'auto', msg)).toBe('data_lookup');
  });

  it('explicit planning rewrite stays planning even if mentions 当前行程', () => {
    const msg = '帮我优化当前行程的路线顺序，减少绕路';
    expect(looksLikeTripPlanningRequest(msg)).toBe(true);
    expect(resolveBoundTripRouteIntentMode(tripId, 'auto', msg)).toBe('planning');
  });

  it('generic bound-trip question stays AUTO', () => {
    expect(resolveBoundTripRouteIntentMode(tripId, 'auto', '这趟旅行大概几天合适？')).toBe('auto');
  });

  it('respects user-explicit modes', () => {
    expect(resolveBoundTripRouteIntentMode(tripId, 'generic_qa', '分析可行性')).toBe('generic_qa');
    expect(resolveBoundTripRouteIntentMode(tripId, 'planning', '分析可行性')).toBe('planning');
  });
});
