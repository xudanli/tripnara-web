import { describe, expect, it } from 'vitest';
import { buildDecisionSpaceVoteCreateDraft, resolveDecisionSpaceVoteDeepLink } from './decision-space-vote.util';

describe('decision-space-vote.util', () => {
  it('buildDecisionSpaceVoteCreateDraft prefills title and options', () => {
    const draft = buildDecisionSpaceVoteCreateDraft(
      {
        problem: {
          id: 'p1',
          type: 'PREFERENCE_CONFLICT',
          title: 'Day 3 路线选择',
          status: 'WAITING_DECISION',
          primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        },
        conflict: {
          id: 'c1',
          category: 'transport',
          title: '冲突标题',
          message: '请在 A/B 方案中选择',
          source: 'feasibility',
          priority: 'must_handle',
          categoryLabel: '交通',
        },
      },
      [
        { id: 'opt-a', title: '方案 A · 保守' },
        { id: 'opt-b', title: '方案 B · 激进' },
      ],
    );

    expect(draft.title).toBe('Day 3 路线选择');
    expect(draft.question).toBe('请在 A/B 方案中选择');
    expect(draft.options).toEqual([
      { id: 'opt-a', label: '方案 A · 保守' },
      { id: 'opt-b', label: '方案 B · 激进' },
    ]);
    expect(draft.autoOpen).toBe(true);
  });

  it('prefers open vote matching problem title', () => {
    const link = resolveDecisionSpaceVoteDeepLink(
      {
        problem: {
          id: 'p1',
          type: 'PREFERENCE_CONFLICT',
          title: 'Day 3 路线选择',
          status: 'WAITING_DECISION',
          primaryEnforcement: 'REQUIRE_ADJUSTMENT',
        },
      },
      [
        {
          id: 'v-closed',
          title: 'Day 3 路线选择',
          status: 'closed',
        },
        {
          id: 'v-open',
          title: 'Day 3 路线选择',
          status: 'open',
        },
      ],
    );

    expect(link.voteId).toBe('v-open');
  });

  it('falls back to first open vote', () => {
    const link = resolveDecisionSpaceVoteDeepLink(
      { conflict: { id: 'c1', title: 'Unrelated', message: '', source: 'feasibility', priority: 'must_handle', category: 'schedule', categoryLabel: '日程' } },
      [
        { id: 'v1', title: '预算分配', status: 'open' },
        { id: 'v2', title: '住宿偏好', status: 'open' },
      ],
    );

    expect(link.voteId).toBe('v1');
  });
});
