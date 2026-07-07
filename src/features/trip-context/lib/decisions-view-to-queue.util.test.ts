import { describe, expect, it } from 'vitest';
import {
  mapDecisionsViewToQueueItems,
  resolveUnifiedDecisionQueueItems,
} from './decisions-view-to-queue.util';

describe('mapDecisionsViewToQueueItems', () => {
  it('maps problems with options and matching issues', () => {
    const items = mapDecisionsViewToQueueItems({
      openDecisionCount: 1,
      displayedIssues: [
        {
          issueId: 'issue-1',
          severity: 'BLOCK',
          headline: '路段封闭',
          consequence: '无法按原计划通行',
          affectedDay: 2,
          decisionRequired: true,
          source: {
            gatewayAssessmentBatchId: 'b1',
            canonicalIssueId: 'prob-1',
            tripId: 't1',
            tripVersion: 1,
          },
        },
      ],
      problems: [
        {
          problemId: 'prob-1',
          issueId: 'issue-1',
          status: 'OPEN',
          options: [
            {
              optionId: 'opt-a',
              title: '改走铁路',
              summary: '多花 40 分钟但更稳',
              preserves: ['住宿不变'],
              sacrifices: ['增加换乘'],
              canApply: true,
            },
          ],
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.problemId).toBe('prob-1');
    expect(items[0]?.headline).toBe('路段封闭');
    expect(items[0]?.recommendation.title).toBe('改走铁路');
    expect(items[0]?.affectedDayNumbers).toEqual([2]);
    expect(items[0]?.actions.acceptRecommended.enabled).toBe(true);
  });

  it('excludes completed problems', () => {
    const items = mapDecisionsViewToQueueItems({
      problems: [{ problemId: 'p1', status: 'COMPLETED' }],
    });
    expect(items).toHaveLength(0);
  });
});

describe('resolveUnifiedDecisionQueueItems', () => {
  const bffItems = [
    {
      problemId: 'bff-only',
      headline: 'BFF item',
      impact: '',
      recommendation: { title: '', summary: '', keeps: [], costs: [] },
      actions: { acceptRecommended: { enabled: true } },
      severity: 'VERIFY' as const,
    },
  ];

  it('prefers TC items when ready', () => {
    const tcItems = resolveUnifiedDecisionQueueItems({
      travelContextEnabled: true,
      travelContextReady: true,
      decisionsView: {
        problems: [{ problemId: 'tc-1', status: 'OPEN', options: [{ optionId: 'o1', title: '方案' }] }],
      },
      bffItems,
    });
    expect(tcItems[0]?.problemId).toBe('tc-1');
  });

  it('returns empty when TC reports zero open decisions', () => {
    const items = resolveUnifiedDecisionQueueItems({
      travelContextEnabled: true,
      travelContextReady: true,
      decisionsView: { openDecisionCount: 0, problems: [] },
      bffItems,
    });
    expect(items).toHaveLength(0);
  });

  it('falls back to BFF when TC not ready', () => {
    const items = resolveUnifiedDecisionQueueItems({
      travelContextEnabled: false,
      travelContextReady: false,
      bffItems,
    });
    expect(items[0]?.problemId).toBe('bff-only');
  });
});
