import { describe, expect, it } from 'vitest';
import {
  isApplyAndPollChain,
  isEvaluateAuthorizeExecuteChain,
  resolveDecisionWriteChain,
  resolveSummaryWriteChain,
} from './decision-write-chain.util';

describe('decision-write-chain.util', () => {
  it('prefers actionability.writeChain over flow', () => {
    expect(
      resolveDecisionWriteChain({
        actionability: { writeChain: 'APPLY_AND_POLL' },
        flow: 'CANONICAL_L2',
      }),
    ).toBe('APPLY_AND_POLL');
  });

  it('falls back from legacy flow', () => {
    expect(resolveDecisionWriteChain({ flow: 'CANONICAL_L2' })).toBe(
      'EVALUATE_AUTHORIZE_EXECUTE',
    );
    expect(resolveDecisionWriteChain({ flow: 'LEGACY_V15' })).toBe('APPLY_AND_POLL');
  });

  it('classifies chains', () => {
    expect(isEvaluateAuthorizeExecuteChain('EVALUATE_AUTHORIZE_EXECUTE')).toBe(true);
    expect(isApplyAndPollChain('APPLY_AND_POLL')).toBe(true);
  });

  it('reads writeChain from summary', () => {
    expect(
      resolveSummaryWriteChain({
        writeChain: 'EVALUATE_AUTHORIZE_EXECUTE',
        flowKind: 'LEGACY_V15',
      }),
    ).toBe('EVALUATE_AUTHORIZE_EXECUTE');
  });
});
