import { describe, expect, it } from 'vitest';
import { pickComparisonFromRouteRun } from '@/lib/decision-strip-route-run';
import type { RouteAndRunResponse } from '@/api/agent';

describe('pickComparisonFromRouteRun', () => {
  it('reads uiOutput.comparison from payload', () => {
    const response = {
      result: {
        payload: {
          uiOutput: {
            comparison: {
              recommendation: { optionId: 'opt-b', reason: '更均衡' },
              options: [{ optionId: 'opt-a' }, { optionId: 'opt-b' }],
            },
          },
        },
      },
    } as unknown as RouteAndRunResponse;

    expect(pickComparisonFromRouteRun(response)?.recommendation?.optionId).toBe('opt-b');
  });

  it('parses options[].tradeoffs from comparison', () => {
    const response = {
      result: {
        payload: {
          uiOutput: {
            comparison: {
              recommendation: { optionId: 'opt-b', reason: '更均衡' },
              options: [
                { optionId: 'opt-a', tradeoffs: ['省 2h'] },
                { optionId: 'opt-b', tradeoffs: ['节奏更稳'] },
              ],
            },
          },
        },
      },
    } as unknown as RouteAndRunResponse;

    const cmp = pickComparisonFromRouteRun(response);
    expect(cmp?.options?.[0]?.tradeoffs).toEqual(['省 2h']);
    expect(cmp?.options?.[1]?.tradeoffs).toEqual(['节奏更稳']);
  });
});
