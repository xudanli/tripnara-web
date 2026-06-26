import { describe, expect, it } from 'vitest';
import { buildFeasibilityVerdictSubheadline, resolveFeasibilityVerdictSubheadline } from '@/lib/feasibility-verdict-copy';

describe('buildFeasibilityVerdictSubheadline', () => {
  it('matches summary chips wording', () => {
    expect(
      buildFeasibilityVerdictSubheadline({
        mustHandle: 10,
        suggestAdjust: 24,
        pendingConfirm: 1,
        blockers: 10,
      }),
    ).toBe('有 10 项必须处理、24 项建议调整、1 项需确认');
  });

  it('omits zero buckets', () => {
    expect(
      buildFeasibilityVerdictSubheadline({
        mustHandle: 2,
        suggestAdjust: 0,
        pendingConfirm: 0,
        blockers: 2,
      }),
    ).toBe('有 2 项必须处理');
  });
});

describe('resolveFeasibilityVerdictSubheadline', () => {
  const summary = {
    mustHandle: 2,
    suggestAdjust: 0,
    pendingConfirm: 0,
    blockers: 2,
  };

  it('prefers backend subheadline (e.g. MC probability)', () => {
    expect(
      resolveFeasibilityVerdictSubheadline('蒙特卡洛可执行概率 82% · E[U]=0.71', summary),
    ).toBe('蒙特卡洛可执行概率 82% · E[U]=0.71');
  });

  it('falls back to summary chips when backend subheadline missing', () => {
    expect(resolveFeasibilityVerdictSubheadline(undefined, summary)).toBe('有 2 项必须处理');
  });
});
