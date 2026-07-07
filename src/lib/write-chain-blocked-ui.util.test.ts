import { describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED } from '@/lib/effective-plan-write-chain.util';
import {
  handleWriteChainBlockedError,
  resolveWriteChainNavigationPath,
} from '@/lib/write-chain-blocked-ui.util';

describe('write-chain-blocked-ui.util', () => {
  it('builds decision problem path when problemId present', () => {
    expect(resolveWriteChainNavigationPath('trip_1', 'prob_1')).toContain('problemId=prob_1');
  });

  it('builds decision space path when problemId missing', () => {
    expect(resolveWriteChainNavigationPath('trip_1')).toContain('decisionSpace=1');
    expect(resolveWriteChainNavigationPath('trip_1')).not.toContain('problemId=');
  });

  it('handles axios write-chain block without retry', () => {
    vi.stubEnv('VITE_DECISION_GATEWAY_UNIFIED', '1');
    const navigate = vi.fn();
    const err = new AxiosError('blocked', '403', undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {
        success: false,
        error: {
          code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
          message: 'Plan mutation blocked (ExecutionService.reorder)',
          details: {
            caller: 'ExecutionService.reorder',
            authorizedPaths: [
              'POST /trips/:tripId/decision-problems/:problemId/resolutions',
              'POST /trips/:tripId/decision-problems/:problemId/apply',
            ],
            writeChain: true,
          },
        },
      },
    });

    expect(handleWriteChainBlockedError(err, { tripId: 'trip_1', navigate })).toBe(true);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('decisionSpace=1'));
    vi.unstubAllEnvs();
  });
});
