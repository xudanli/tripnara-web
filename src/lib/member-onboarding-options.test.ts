import { describe, expect, it } from 'vitest';
import {
  joinCoreWishes,
  joinOnboardingSelections,
  joinPrivateConcerns,
  splitCoreWishes,
  splitOnboardingSelections,
  splitPrivateConcerns,
} from './member-onboarding-options';

describe('member-onboarding-options', () => {
  it('splits and joins multi-select strings', () => {
    const raw = '徒步、温泉、自定义项';
    const split = splitOnboardingSelections(raw, ['徒步', '温泉'] as const);
    expect(split.selected).toEqual(['徒步', '温泉']);
    expect(split.other).toBe('自定义项');
    expect(joinOnboardingSelections(split.selected, split.other)).toBe(raw);
  });

  it('joins core wishes up to max 3', () => {
    expect(joinCoreWishes(['自然风光', '美食探索'], '其他', 3)).toEqual([
      '自然风光',
      '美食探索',
      '其他',
    ]);
  });

  it('treats empty private notes as 暂无补充', () => {
    expect(splitPrivateConcerns('').selected).toContain('暂无补充');
    expect(joinPrivateConcerns(['暂无补充'])).toBe('');
  });

  it('round-trips core wishes', () => {
    const wishes = ['极光星空', '我的自定义'];
    const split = splitCoreWishes(wishes);
    expect(split.selected).toContain('极光星空');
    expect(split.other).toBe('我的自定义');
    expect(joinCoreWishes(split.selected, split.other)).toEqual(wishes);
  });
});
