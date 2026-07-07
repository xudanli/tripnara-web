import { describe, expect, it } from 'vitest';
import {
  isHardDecisionEnforcement,
  readPrimaryEnforcement,
} from '@/lib/decision-problem-enforcement.util';

describe('decision-problem-enforcement.util', () => {
  it('reads assertions[0].enforcement', () => {
    expect(
      readPrimaryEnforcement({
        assertions: [{ enforcement: 'SOFT' }, { enforcement: 'HARD' }],
      }),
    ).toBe('SOFT');
  });

  it('detects hard enforcement without constraint type', () => {
    expect(isHardDecisionEnforcement('HARD')).toBe(true);
    expect(isHardDecisionEnforcement('on')).toBe(true);
    expect(isHardDecisionEnforcement('must_handle')).toBe(true);
    expect(isHardDecisionEnforcement('SOFT')).toBe(false);
    expect(isHardDecisionEnforcement(undefined)).toBe(false);
  });
});
