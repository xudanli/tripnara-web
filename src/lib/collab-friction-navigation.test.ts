import { describe, expect, it } from 'vitest';
import { resolveFrictionNegotiationDeepLink } from './collab-friction-navigation';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';

describe('collab-friction-navigation', () => {
  it('prefers in_discussion task with activeRoundId', () => {
    const tasks = [
      {
        id: 'n1',
        domain: 'activities',
        status: 'in_discussion',
        activeRoundId: 'r1',
      },
    ] as DomainNegotiationTask[];

    const link = resolveFrictionNegotiationDeepLink({ domain: 'activities' }, tasks);
    expect(link.roundDomain).toBe('activities');
    expect(link.roundId).toBe('r1');
  });

  it('falls back to pending task domain', () => {
    const tasks = [
      {
        id: 'n2',
        domain: 'dining',
        status: 'pending',
        activeRoundId: null,
      },
    ] as DomainNegotiationTask[];

    const link = resolveFrictionNegotiationDeepLink({ domain: 'dining' }, tasks);
    expect(link.roundDomain).toBe('dining');
    expect(link.roundId).toBeNull();
  });
});
