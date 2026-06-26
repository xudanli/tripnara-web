import { describe, expect, it } from 'vitest';
import {
  buildCausalObservation,
  parseCausalObservation,
  shouldSkipLlmGuardianEval,
} from '@/lib/causal-observation.util';

describe('causal-observation.util', () => {
  it('buildCausalObservation uses v1 schema', () => {
    const obs = buildCausalObservation({
      metrics: { iceland_miss_prob: 1 },
      missed_appointment: true,
      narrative: '错过集合',
    });
    expect(obs.schema).toBe('tripnara/causal-observation/v1');
    expect(obs.metrics?.iceland_miss_prob).toBe(1);
  });

  it('parseCausalObservation reads extensions block', () => {
    const obs = buildCausalObservation({ narrative: 'x' });
    expect(parseCausalObservation({ causal_observation: obs })).toEqual(obs);
    expect(parseCausalObservation({ other: 1 })).toBeNull();
  });

  it('shouldSkipLlmGuardianEval when kernelAuthoritative', () => {
    expect(shouldSkipLlmGuardianEval({ kernelAuthoritative: true })).toBe(true);
    expect(shouldSkipLlmGuardianEval({ kernelAuthoritative: false })).toBe(false);
    expect(shouldSkipLlmGuardianEval(undefined)).toBe(false);
  });
});
