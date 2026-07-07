import { describe, expect, it } from 'vitest';
import {
  dayIndexesWithOpenDecisionProblems,
  openDecisionProblemsForDayIndex,
} from '@/lib/decision-problems-by-day.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

describe('decision-problems-by-day.util', () => {
  const items: DecisionProblemSummary[] = [
    {
      id: 'p1',
      type: 'RISK',
      title: '第3天 · 红沙滩道路关闭',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      affectedDayNumbers: [3],
    },
    {
      id: 'p2',
      type: 'RISK',
      title: '第5天 · 米湖 → 迪尔餐厅',
      status: 'RESOLVED',
      primaryEnforcement: 'ADVISE',
      affectedDayNumbers: [5],
    },
  ];

  it('maps open problems to day indexes', () => {
    expect(dayIndexesWithOpenDecisionProblems(items)).toEqual(new Set([2]));
  });

  it('returns problems for day index', () => {
    expect(openDecisionProblemsForDayIndex(items, 2)).toHaveLength(1);
    expect(openDecisionProblemsForDayIndex(items, 4)).toHaveLength(0);
  });
});
