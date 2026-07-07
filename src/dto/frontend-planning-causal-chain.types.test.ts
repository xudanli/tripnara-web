import { describe, expect, it } from 'vitest';
import {
  formatCausalChainBasisAge,
  planningCausalChainNodesFromCheckerCascade,
} from '@/dto/frontend-planning-causal-chain.types';

describe('planningCausalChainNodesFromCheckerCascade', () => {
  it('maps checker cascade to ordered causal nodes', () => {
    const nodes = planningCausalChainNodesFromCheckerCascade([
      {
        id: 'c2',
        order: 1,
        title: '缓冲',
        description: '交通缓冲被消耗',
        status: 'affected',
      },
      {
        id: 'c1',
        order: 0,
        title: '根因',
        description: '道路耗时增加',
        status: 'ok',
      },
      {
        id: 'c3',
        order: 2,
        title: '风险',
        description: '连锁延误风险',
        status: 'at_risk',
      },
    ]);

    expect(nodes.map((n) => n.id)).toEqual(['c1', 'c2', 'c3']);
    expect(nodes[0]?.severity).toBe('info');
    expect(nodes[1]?.severity).toBe('warn');
    expect(nodes[2]?.severity).toBe('risk');
    expect(nodes[1]?.source).toBe('decision_checker');
  });
});

describe('formatCausalChainBasisAge', () => {
  it('formats minutes ago', () => {
    const now = Date.parse('2026-07-06T09:30:00.000Z');
    expect(formatCausalChainBasisAge('2026-07-06T09:18:00.000Z', now)).toBe('12 分钟前');
  });
});
