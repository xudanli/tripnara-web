import { describe, expect, it } from 'vitest';
import { resolveDecisionSpaceBundleSurface } from './decision-space-bundle.util';

describe('resolveDecisionSpaceBundleSurface', () => {
  it('uses default surface before option selection', () => {
    expect(resolveDecisionSpaceBundleSurface(null)).toBe('default');
    expect(resolveDecisionSpaceBundleSurface(undefined)).toBe('default');
    expect(resolveDecisionSpaceBundleSurface('')).toBe('default');
  });

  it('uses inspector surface after option selection for inline preview', () => {
    expect(resolveDecisionSpaceBundleSurface('adjust_time')).toBe('inspector');
  });
});
