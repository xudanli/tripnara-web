import { describe, expect, it } from 'vitest';
import {
  parseDecisionNavigationTarget,
  resolveDecisionActionExternalUrl,
} from './decision-navigation.util';
import type { DecisionAction } from '@/types/unified-decision';

describe('decision-navigation.util', () => {
  it('parses navigationTarget object with externalUrl in params', () => {
    const nav = parseDecisionNavigationTarget({
      command: 'OPEN_EXTERNAL',
      params: { externalUrl: 'https://www.bluelagoon.com/day-visit/the-blue-lagoon' },
    });
    expect(nav?.externalUrl).toBe('https://www.bluelagoon.com/day-visit/the-blue-lagoon');
  });

  it('resolves externalUrl from navigationTarget object params', () => {
    const action: DecisionAction = {
      actionId: 'planb_0',
      label: '立即预订',
      allowed: true,
      navigationTarget: {
        command: 'OPEN_PLAN_GATE',
        params: {
          tripId: 't1',
          problemId: 'p1',
          actionId: 'planb_0',
          externalUrl: 'https://www.bluelagoon.com/day-visit/the-blue-lagoon',
        },
      },
    };
    expect(resolveDecisionActionExternalUrl(action)).toBe(
      'https://www.bluelagoon.com/day-visit/the-blue-lagoon',
    );
  });

  it('resolves externalUrl from payload.externalUrl (Plan B enrichment)', () => {
    const action: DecisionAction = {
      actionId: 'BOOK_NOW',
      label: '立即预订',
      allowed: true,
      payload: { externalUrl: 'https://example.com/book' },
    };
    expect(resolveDecisionActionExternalUrl(action)).toBe('https://example.com/book');
  });
});
