import { describe, expect, it } from 'vitest';
import type { CompareRouteCard } from '../types';
import {
  isCompareRouteFocused,
  resolveCompareHighlightRouteId,
  resolveUserCompareFocusRouteId,
} from './compare-highlight.util';

const routes: CompareRouteCard[] = [
  {
    id: 'route_a',
    apiRouteId: 'route_a',
    title: 'A',
    gains: [],
    sacrifices: [],
    matchScore: 60,
  },
  {
    id: 'route_b',
    apiRouteId: 'route_b',
    title: 'B',
    gains: [],
    sacrifices: [],
    matchScore: 90,
    badge: { label: '推荐', tone: 'recommended' },
  },
];

describe('compare-highlight.util', () => {
  it('prefers user focus route when present in candidates', () => {
    expect(resolveCompareHighlightRouteId(routes, 'route_a')).toBe('route_a');
    expect(resolveUserCompareFocusRouteId(routes, 'route_a')).toBe('route_a');
  });

  it('returns undefined when focus route is not in candidates', () => {
    expect(resolveUserCompareFocusRouteId(routes, 'route_missing')).toBeUndefined();
  });

  it('falls back to recommended route when focus is missing', () => {
    expect(resolveCompareHighlightRouteId(routes)).toBe('route_b');
  });

  it('matches focus by apiRouteId alias', () => {
    expect(isCompareRouteFocused(routes[0]!, 'route_a')).toBe(true);
  });
});
