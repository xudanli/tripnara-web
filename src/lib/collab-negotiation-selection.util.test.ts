import { describe, expect, it } from 'vitest';
import {
  findNegotiationTaskForSelection,
  resolveNegotiationTaskId,
} from './collab-negotiation-selection.util';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

const domainA: DomainNegotiationTask = {
  id: 'neg_domain',
  domain: 'destination_route',
  title: '目的地与路线',
  status: 'pending',
  statusLabel: '待定',
  crossLevel: 'high',
  closesAt: null,
};

const decisionItem: DomainNegotiationTask = {
  id: 'neg_dp_meal',
  domain: 'destination_route',
  title: '布迪尔黑教堂 · 团队确认',
  status: 'pending',
  statusLabel: '待跟进',
  crossLevel: 'medium',
  closesAt: null,
  source: 'decision_problem',
  decisionProblemId: 'dp_meal',
};

describe('collab-negotiation-selection.util', () => {
  const tasks = [domainA, decisionItem];

  it('prefers negotiationTaskId over domain', () => {
    const match = findNegotiationTaskForSelection(tasks, {
      negotiationTaskId: 'neg_dp_meal',
      roundDomain: 'destination_route',
    });
    expect(match?.id).toBe('neg_dp_meal');
    expect(match?.title).toContain('布迪尔');
  });

  it('falls back to domain when id missing', () => {
    const match = findNegotiationTaskForSelection(tasks, {
      roundDomain: 'destination_route',
    });
    expect(match?.id).toBe('neg_domain');
  });

  it('resolveNegotiationTaskId uses explicit id', () => {
    expect(
      resolveNegotiationTaskId(tasks, {
        negotiationTaskId: 'neg_dp_meal',
        roundDomain: 'destination_route',
      }),
    ).toBe('neg_dp_meal');
  });
});
