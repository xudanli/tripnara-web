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
});
