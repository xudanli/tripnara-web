import { describe, expect, it } from 'vitest';
import {
  buildDecisionAiSummary,
  buildDecisionAiSummaryView,
  filterDecisionQueueTasks,
  resolveQueueStageLabel,
} from '@/lib/collab-decisions-dashboard.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

const baseTask = (overrides: Partial<DomainNegotiationTask>): DomainNegotiationTask => ({
  id: 't1',
  domain: 'activities',
  title: 'Day 3 冰川徒步',
  status: 'in_discussion',
  statusLabel: '协商中',
  crossLevel: 'high',
  closesAt: null,
  ...overrides,
});

describe('collab-decisions-dashboard.util', () => {
  it('filters queue by domain and priority', () => {
    const tasks = [
      baseTask({ id: 'a', domain: 'accommodation', title: '住宿标准', crossLevel: 'medium' }),
      baseTask({ id: 'b', domain: 'activities', title: '每日预算上限', crossLevel: 'high' }),
    ];
    const filtered = filterDecisionQueueTasks(tasks, 'budget', '高');
    expect(filtered.map((t) => t.id)).toEqual(['b']);
  });

  it('resolves queue stage labels', () => {
    const task = baseTask({});
    expect(resolveQueueStageLabel(task, new Set())).toBe('选项讨论中');
    expect(resolveQueueStageLabel(task, new Set(['Day 3 冰川徒步']))).toBe('静默投票中');
  });

  it('builds ai summary from stats', () => {
    const input = {
      stats: { pending: 2, inNegotiation: 1, inVoting: 0, consensusReached: 3 },
      tasks: [baseTask({ title: '住宿标准' }), baseTask({ id: 'x', title: '每日预算' })],
    };
    const summary = buildDecisionAiSummary(input);
    expect(summary).toContain('关键分歧集中在');

    const view = buildDecisionAiSummaryView(input);
    expect(view.highlights).toEqual(['住宿标准', '每日预算']);
    expect(view.prefix).toBe('关键分歧集中在');
  });
});
