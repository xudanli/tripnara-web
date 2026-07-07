import { describe, expect, it } from 'vitest';
import {
  resolveTripDestinationInsightsQuery,
  tripDestinationInsightsQueryKey,
} from './trip-destination-insights-query.util';

describe('resolveTripDestinationInsightsQuery', () => {
  it('returns null when no scope params', () => {
    expect(resolveTripDestinationInsightsQuery({})).toBeNull();
    expect(resolveTripDestinationInsightsQuery({ includeRag: true })).toBeNull();
  });

  it('passes problemId and focusConflictId', () => {
    expect(
      resolveTripDestinationInsightsQuery({
        problemId: 'dp_id:coverage-gap:1',
        focusConflictId: 'issue-gap-2',
      }),
    ).toEqual({
      problemId: 'dp_id:coverage-gap:1',
      focusConflictId: 'issue-gap-2',
    });
  });

  it('supports poiSlug, placeId, dayIndex, includeRag', () => {
    expect(
      resolveTripDestinationInsightsQuery({
        poiSlug: 'is.reynisfjara',
        placeId: 'place_1',
        dayIndex: 2,
        includeRag: true,
      }),
    ).toEqual({
      poiSlug: 'is.reynisfjara',
      placeId: 'place_1',
      dayIndex: 2,
      includeRag: true,
    });
  });

  it('trims whitespace and ignores negative dayIndex', () => {
    expect(
      resolveTripDestinationInsightsQuery({
        problemId: '  prob_1  ',
        dayIndex: -1,
      }),
    ).toEqual({ problemId: 'prob_1' });
  });
});

describe('tripDestinationInsightsQueryKey', () => {
  it('includes rag flag in key', () => {
    const base = tripDestinationInsightsQueryKey('trip_1', { problemId: 'p1' });
    const withRag = tripDestinationInsightsQueryKey('trip_1', {
      problemId: 'p1',
      includeRag: true,
    });
    expect(base).not.toEqual(withRag);
  });
});
