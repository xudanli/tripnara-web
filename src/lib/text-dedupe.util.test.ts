import { describe, expect, it } from 'vitest';
import {
  assessmentRedundantWithChainNodes,
  extractCausalInterventionHint,
  textsSubstantiallyOverlap,
} from './text-dedupe.util';

describe('text-dedupe.util', () => {
  it('detects identical texts', () => {
    expect(textsSubstantiallyOverlap('错过预约的概率约为 78%', '错过预约的概率约为 78%')).toBe(true);
  });

  it('treats multi-node chain as replacing assessment prose', () => {
    const assessment =
      'south_coast 路段阵风预计较强（约 12 m/s）。P90 行驶时间约为 1 小时 23 分。错过预约概率 78%。最小干预建议将出发时间提前 20 分钟。';
    expect(
      assessmentRedundantWithChainNodes(assessment, [
        { title: '天气影响', description: '预计出现 12 m/s 阵风' },
        { title: '通行耗时', description: 'P90 通行时间增加约 23 分钟' },
        { title: '预约风险', description: '错过预约的概率约为 78%' },
      ]),
    ).toBe(true);
  });

  it('extracts intervention hint from assessment', () => {
    const assessment =
      'south_coast 路段阵风预计较强。最小干预建议将出发时间提前 20 分钟。';
    expect(extractCausalInterventionHint(assessment)).toBe('最小干预建议将出发时间提前 20 分钟');
  });
});
