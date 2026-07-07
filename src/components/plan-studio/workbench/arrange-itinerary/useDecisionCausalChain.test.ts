import { describe, expect, it } from 'vitest';
import { decisionCausalChainKeys } from './useDecisionCausalChain';

describe('decisionCausalChainKeys', () => {
  it('includes optionId in query key for option-scoped refresh', () => {
    expect(
      decisionCausalChainKeys.trip('trip-1', {
        problemId: 'prob_a',
        optionId: 'adjust_time',
      }),
    ).toEqual(['decision-causal-chain', 'trip-1', '', 'prob_a', 'adjust_time']);
  });

  it('uses empty optionId slot before selection', () => {
    expect(decisionCausalChainKeys.trip('trip-1', { problemId: 'prob_a' })).toEqual([
      'decision-causal-chain',
      'trip-1',
      '',
      'prob_a',
      '',
    ]);
  });
});
