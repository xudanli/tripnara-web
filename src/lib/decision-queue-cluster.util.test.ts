import { describe, expect, it } from 'vitest';
import {
  clusterDecisionProblemsForQueue,
  formatDecisionQueueMergeSummary,
  resolveDecisionQueueClusters,
} from '@/lib/decision-queue-cluster.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

function problem(partial: Partial<DecisionProblemSummary> & Pick<DecisionProblemSummary, 'id' | 'title'>): DecisionProblemSummary {
  return {
    type: 'INFEASIBILITY',
    status: 'OPEN',
    primaryEnforcement: 'REQUIRE_ADJUSTMENT',
    ...partial,
  };
}

describe('clusterDecisionProblemsForQueue', () => {
  it('merges same-day buffer problems into one cluster', () => {
    const items = [
      problem({ id: 'p1', title: '第1天交通缓冲偏紧', affectedDayNumbers: [1] }),
      problem({ id: 'p2', title: '交通缓冲偏紧', affectedDayNumbers: [1] }),
      problem({ id: 'p3', title: '第2天黄金圈顺序', affectedDayNumbers: [2], primaryEnforcement: 'WARN' }),
    ];

    const clusters = clusterDecisionProblemsForQueue(items);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.problemIds).toEqual(['p1', 'p2']);
    expect(clusters[0]?.mayResolveCount).toBe(1);
    expect(clusters[1]?.problemIds).toEqual(['p3']);
  });

  it('formats merge summary when diagnostics exceed clusters', () => {
    expect(
      formatDecisionQueueMergeSummary({ diagnosticCount: 14, clusterCount: 5 }),
    ).toBe('AI 已将 14 项诊断合并为 5 个决策');
    expect(formatDecisionQueueMergeSummary({ diagnosticCount: 3, clusterCount: 3 })).toBeNull();
  });

  it('hydrates BFF summaries with client problems for expand/sub-items', () => {
    const items = [
      problem({ id: 'p1', title: '第2天交通缓冲偏紧', affectedDayNumbers: [2] }),
      problem({ id: 'p2', title: '交通缓冲偏紧', affectedDayNumbers: [2] }),
    ];
    const bffClusters = [
      {
        id: 'bff_day2',
        title: '第 2 天 · 当日节奏与时间压力',
        dayBadge: '第 2 天',
        dayNumbers: [2],
        problemIds: ['bff_only'],
        representativeProblemId: 'bff_only',
        problems: [],
        processingKind: 'must_confirm' as const,
        processingLabel: '必须确认',
        dependencies: [],
        mayResolveCount: 1,
      },
    ];

    const clusters = resolveDecisionQueueClusters(items, bffClusters);
    expect(clusters[0]?.title).toBe('第 2 天 · 当日节奏与时间压力');
    expect(clusters[0]?.problems).toHaveLength(2);
    expect(clusters[0]?.mayResolveCount).toBeGreaterThanOrEqual(1);
  });
});
