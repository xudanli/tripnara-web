import { describe, expect, it } from 'vitest';
import {
  computeOverallScore,
  resolveSolutionDiffTone,
} from '@/lib/solution-diff.util';

describe('resolveSolutionDiffTone', () => {
  it('treats higher-is-better dimensions', () => {
    expect(resolveSolutionDiffTone(80, 90, true)).toBe('better');
    expect(resolveSolutionDiffTone(90, 80, true)).toBe('worse');
    expect(resolveSolutionDiffTone(80, 80, true)).toBe('same');
  });

  it('treats lower-is-better dimensions', () => {
    expect(resolveSolutionDiffTone(80, 70, false)).toBe('better');
    expect(resolveSolutionDiffTone(70, 80, false)).toBe('worse');
  });

  it('returns neutral for missing values', () => {
    expect(resolveSolutionDiffTone(null, 80, true)).toBe('neutral');
  });
});

describe('computeOverallScore', () => {
  it('averages numeric scores', () => {
    expect(computeOverallScore({ a: 80, b: 60 })).toBe(70);
  });

  it('returns null when empty', () => {
    expect(computeOverallScore(undefined)).toBeNull();
  });
});
