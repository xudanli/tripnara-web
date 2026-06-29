import { describe, expect, it } from 'vitest';
import {
  aggregateFrictionByDomain,
  frictionImpactDimension,
  frictionPointTitle,
} from './collab-friction-domains';
import type { FrictionMatrixPair, HighRiskAlert } from '@/types/trip-decision-profiling';

describe('aggregateFrictionByDomain', () => {
  it('aggregates worst level and max score per domain', () => {
    const pairs: FrictionMatrixPair[] = [
      {
        memberAId: 'a',
        memberBId: 'b',
        memberAName: 'A',
        memberBName: 'B',
        overallLevel: 'yellow',
        cells: [
          { domain: 'budget', level: 'yellow', score: 56, reason: '预算差' },
          { domain: 'pace', level: 'green', score: 20, reason: '节奏一致' },
        ],
      },
      {
        memberAId: 'c',
        memberBId: 'd',
        memberAName: 'C',
        memberBName: 'D',
        overallLevel: 'red',
        cells: [
          { domain: 'budget', level: 'red', score: 72, reason: '预算冲突' },
          { domain: 'activities', level: 'yellow', score: 45, reason: '体验差' },
        ],
      },
    ];

    const rows = aggregateFrictionByDomain(pairs);
    const budget = rows.find((r) => r.domain === 'budget');
    expect(budget?.level).toBe('red');
    expect(budget?.score).toBe(72);
    expect(rows.some((r) => r.domain === 'activities')).toBe(true);
  });
});

describe('friction alert labels', () => {
  it('builds friction point title and impact dimension', () => {
    const alert: HighRiskAlert = {
      id: '1',
      domain: 'budget',
      domainLabel: '预算心理',
      level: 'red',
      memberAName: 'A',
      memberBName: 'B',
      summary: '消费档位差异大',
      recommendedStrategy: '先对齐总预算',
    };
    expect(frictionPointTitle(alert)).toBe('预算心理不一致');
    expect(frictionImpactDimension(alert)).toBe('预算重叠度');
  });
});
