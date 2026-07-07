import { describe, expect, it } from 'vitest';
import {
  findProblemOptionForCausalOptionId,
  isCausalChainOptionIdNode,
  isTechnicalCausalOptionReference,
  resolveCausalStoryRecommendedSummary,
} from './causal-story-option-display.util';
import type { DecisionOption } from '@/types/decision-problem';

const OPTIONS: DecisionOption[] = [
  {
    id: 'opt_shift',
    title: '顺延下一项开始时间',
    description: '将下一行程项开始时间后移',
  },
  {
    id: 'opt_delay_poi',
    title: '将哈尔格林姆斯教堂推迟到 11:51',
  },
];

describe('causal-story-option-display.util', () => {
  it('detects technical causal option references', () => {
    expect(isTechnicalCausalOptionReference('选择 adjust_time', 'adjust_time')).toBe(true);
    expect(isTechnicalCausalOptionReference('方案 adjust_time', 'adjust_time')).toBe(true);
    expect(isTechnicalCausalOptionReference('顺延下一项开始时间')).toBe(false);
  });

  it('matches problem options by technical option id', () => {
    expect(findProblemOptionForCausalOptionId('adjust_time', OPTIONS)).toEqual({
      option: OPTIONS[0],
      index: 0,
    });
    expect(findProblemOptionForCausalOptionId('opt_delay_poi', OPTIONS)?.index).toBe(1);
  });

  it('resolves human-readable recommended summary', () => {
    expect(
      resolveCausalStoryRecommendedSummary({
        recommendedOption: {
          optionId: 'adjust_time',
          summary: '选择 adjust_time',
          expectedImprovement: '改善预约可行性',
        },
        problemOptions: OPTIONS,
      }),
    ).toBe('方案 A · 顺延下一项开始时间');
  });

  it('filters causal chain nodes that repeat technical option ids', () => {
    expect(
      isCausalChainOptionIdNode(
        {
          nodeId: 'n_opt',
          type: 'OPTION',
          title: '可选方案',
          description: '方案 adjust_time',
        },
        'adjust_time',
      ),
    ).toBe(true);
  });
});
