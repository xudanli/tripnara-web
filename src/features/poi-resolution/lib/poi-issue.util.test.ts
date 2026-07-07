import { describe, expect, it } from 'vitest';
import type { ConsumerIssueView } from '@/features/exploration/api/types';
import {
  isPoiConfirmationIssue,
  resolvePoiConfirmCountryCode,
  resolvePoiFromConsumerIssue,
} from './poi-issue.util';

const baseIssue: ConsumerIssueView = {
  issueId: 'cpre-poi-secret-canyon',
  severity: 'VERIFY',
  headline: '请确认地点：Secret Canyon',
  decisionRequired: true,
  source: {
    gatewayAssessmentBatchId: 'batch-1',
    canonicalIssueId: 'poi-secret-canyon',
    tripId: 'trip-1',
    tripVersion: 1,
  },
};

describe('poi-issue util', () => {
  it('detects POI confirmation issues by issueId prefix', () => {
    expect(isPoiConfirmationIssue({ issueId: 'cpre-poi-blue-lagoon' })).toBe(true);
    expect(isPoiConfirmationIssue({ issueId: 'vehicle-f208-mismatch' })).toBe(false);
  });

  it('detects POI confirmation issues by cprePoi field', () => {
    expect(
      isPoiConfirmationIssue({
        issueId: 'issue-123',
        cprePoi: { queryName: 'Blue Lagoon' },
      }),
    ).toBe(true);
  });

  it('maps consumer issue to ResolvedPoi using cprePoi', () => {
    const issue: ConsumerIssueView = {
      ...baseIssue,
      cprePoi: {
        queryName: 'Secret Canyon',
        countryCode: 'IS',
        locale: 'zh',
        candidates: [{ poiId: 'is.studlagil', canonicalName: 'Stuðlagil Canyon', confidence: 0.68 }],
      },
    };
    expect(resolvePoiFromConsumerIssue(issue)).toEqual({
      name: 'Secret Canyon',
      canonicalName: undefined,
      poiId: undefined,
      confidence: undefined,
      status: 'NEEDS_CONFIRMATION',
      candidates: [{ poiId: 'is.studlagil', canonicalName: 'Stuðlagil Canyon', confidence: 0.68 }],
    });
    expect(resolvePoiConfirmCountryCode(issue)).toBe('IS');
  });

  it('falls back to headline and issueId slug', () => {
    expect(resolvePoiFromConsumerIssue(baseIssue).name).toBe('Secret Canyon');
    expect(
      resolvePoiFromConsumerIssue({
        ...baseIssue,
        headline: '',
        issueId: 'cpre-poi-blue-lagoon',
      }).name,
    ).toBe('blue lagoon');
  });
});
