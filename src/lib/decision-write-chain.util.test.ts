import { describe, expect, it } from 'vitest';
import {
  isApplyAndPollChain,
  isConstraintWritebackChain,
  isEvaluateAuthorizeExecuteChain,
  resolveDecisionWriteChain,
  resolveSummaryWriteChain,
  usesResolveApplyWritePath,
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
    expect(isConstraintWritebackChain('CONSTRAINT_WRITEBACK')).toBe(true);
    expect(usesResolveApplyWritePath('CONSTRAINT_WRITEBACK')).toBe(true);
    expect(usesResolveApplyWritePath('APPLY_AND_POLL')).toBe(true);
    expect(usesResolveApplyWritePath('EVALUATE_AUTHORIZE_EXECUTE')).toBe(false);
  });

  it('resolves CONSTRAINT_WRITEBACK from actionability', () => {
    expect(
      resolveDecisionWriteChain({
        actionability: { writeChain: 'CONSTRAINT_WRITEBACK' },
        flow: 'CANONICAL_L2',
      }),
    ).toBe('CONSTRAINT_WRITEBACK');
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
