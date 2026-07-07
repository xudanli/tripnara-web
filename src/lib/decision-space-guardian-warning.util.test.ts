import { describe, expect, it } from 'vitest';
import { resolveGuardianCausalHeadline } from '@/lib/causal-trace-view.util';
import { resolveDecisionSpaceGuardianWarning } from '@/lib/decision-space-guardian-warning.util';

describe('resolveGuardianCausalHeadline', () => {
  it('reads headline from partial guardianCausalStoryView without full trace fields', () => {
    expect(
      resolveGuardianCausalHeadline({
        guardianCausalStoryView: {
          headline: '安全提示：蓝湖温泉 → 哈尔格林姆斯教堂 强风下不建议按原计划出发',
        },
      }),
    ).toBe('安全提示：蓝湖温泉 → 哈尔格林姆斯教堂 强风下不建议按原计划出发');
  });

  it('reads flat guardianHeadline field', () => {
    expect(
      resolveGuardianCausalHeadline({
        guardianHeadline: 'Abu：强风不建议出发',
      }),
    ).toBe('Abu：强风不建议出发');
  });
});

describe('resolveDecisionSpaceGuardianWarning', () => {
  it('falls back to list problem guardianCausalHeadline when detail is partial', () => {
    expect(
      resolveDecisionSpaceGuardianWarning({
        detail: { guardianCausalStoryView: { headline: '仅 headline' } },
        problem: { id: 'p1', title: 'x', guardianCausalHeadline: '列表缓存' },
      }),
    ).toBe('仅 headline');

    expect(
      resolveDecisionSpaceGuardianWarning({
        detail: {},
        problem: { id: 'p1', title: 'x', guardianCausalHeadline: '列表缓存' },
      }),
    ).toBe('列表缓存');
  });
});
