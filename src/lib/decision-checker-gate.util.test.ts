import { describe, expect, it } from 'vitest';
import {
  resolveDecisionCheckerOverviewGateMessage,
  resolveDecisionCheckerOverviewGateStatus,
} from './decision-checker-gate.util';

describe('resolveDecisionCheckerOverviewGateStatus', () => {
  it('returns REJECT when hard conflicts exist', () => {
    expect(
      resolveDecisionCheckerOverviewGateStatus({
        conflict: { hardCount: 2, softCount: 0 },
      }),
    ).toBe('REJECT');
  });

  it('returns SUGGEST_REPLACE for soft-only conflicts', () => {
    expect(
      resolveDecisionCheckerOverviewGateStatus({
        conflict: { hardCount: 0, softCount: 3 },
      }),
    ).toBe('SUGGEST_REPLACE');
  });

  it('returns NEED_CONFIRM when repair plan present without conflicts', () => {
    expect(
      resolveDecisionCheckerOverviewGateStatus({
        conflict: { hardCount: 0, softCount: 0 },
        repairPlan: {
          id: 'r1',
          source: 'relaxation',
          title: '调整节奏',
          description: '',
        },
      }),
    ).toBe('NEED_CONFIRM');
  });

  it('prefers primary conflict message', () => {
    expect(
      resolveDecisionCheckerOverviewGateMessage({
        conflict: {
          hardCount: 1,
          primary: { title: 'x', message: '封路影响', severity: 'hard' },
        },
      }),
    ).toBe('封路影响');
  });
});
