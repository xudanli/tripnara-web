import { describe, expect, it, vi } from 'vitest';
import {
  settleArrangeWriteResult,
  shouldConfirmArrangeProposal,
} from './arrange-proposal-auto-apply.util';
import type { PlanProposal } from '@/types/arrange-itinerary';

function baseProposal(
  overrides: Partial<PlanProposal> = {},
): PlanProposal {
  return {
    proposalId: 'p1',
    tripId: 'trip-1',
    intent: 'AUTO_ARRANGE',
    basePlanVersion: 1,
    contextVersion: 1,
    affectedDays: [1],
    changes: [],
    validation: { status: 'PASS', warnings: [], conflicts: [] },
    diff: { summary: 'ok', timelineChanges: [] },
    requiresConfirmation: true,
    status: 'AWAITING_CONFIRMATION',
    ...overrides,
  };
}

describe('shouldConfirmArrangeProposal', () => {
  it('returns false for PASS without conflicts or decision options', () => {
    expect(shouldConfirmArrangeProposal(baseProposal())).toBe(false);
  });

  it('returns false for PASS with a single decision option', () => {
    expect(
      shouldConfirmArrangeProposal(
        baseProposal({
          intent: 'PLACE_CANDIDATE',
          decisionPack: {
            options: [
              { id: 'a', optionKind: 'SHIFT_LATER', title: '写入正式行程', recommended: true },
            ],
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns true for WARN or BLOCK', () => {
    expect(
      shouldConfirmArrangeProposal(
        baseProposal({ validation: { status: 'WARN', warnings: ['略紧'], conflicts: [] } }),
      ),
    ).toBe(true);
    expect(
      shouldConfirmArrangeProposal(
        baseProposal({ validation: { status: 'BLOCK', warnings: [], conflicts: [] } }),
      ),
    ).toBe(true);
  });

  it('returns true when multiple decision options exist (including 保持原计划)', () => {
    expect(
      shouldConfirmArrangeProposal(
        baseProposal({
          intent: 'PLACE_CANDIDATE',
          decisionPack: {
            options: [
              { id: 'a', optionKind: 'SHIFT_LATER', title: '顺延行程', recommended: true },
              { id: 'b', optionKind: 'ACCEPT_RISK', title: '保持原计划' },
            ],
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns true when validation has conflicts', () => {
    expect(
      shouldConfirmArrangeProposal(
        baseProposal({
          validation: {
            status: 'PASS',
            warnings: [],
            conflicts: [{ kind: 'buffer', message: '缓冲不足' }],
          },
        }),
      ),
    ).toBe(true);
  });
});

describe('settleArrangeWriteResult', () => {
  it('auto-applies unambiguous proposal writes', async () => {
    const apply = vi.fn().mockResolvedValue({ candidates: { candidates: [], summary: {} } });
    const outcome = await settleArrangeWriteResult(
      {
        mode: 'proposal' as const,
        tripId: 'trip-1',
        orchestrationState: {
          tripId: 'trip-1',
          phase: 'AWAITING_CONFIRMATION' as const,
          contextVersion: 1,
        },
        proposal: baseProposal({ intent: 'PLACE_CANDIDATE' }),
      },
      apply,
    );
    expect(outcome.status).toBe('auto_applied');
    expect(apply).toHaveBeenCalledWith('p1', 1);
  });

  it('keeps confirmation when multiple options exist', async () => {
    const apply = vi.fn();
    const result = {
      mode: 'proposal' as const,
      tripId: 'trip-1',
      orchestrationState: {
        tripId: 'trip-1',
        phase: 'AWAITING_CONFIRMATION' as const,
        contextVersion: 1,
      },
      proposal: baseProposal({
        decisionPack: {
          options: [
            { id: 'a', optionKind: 'SHIFT_LATER', title: 'A', recommended: true },
            { id: 'b', optionKind: 'ACCEPT_RISK', title: 'B' },
          ],
        },
      }),
    };
    const outcome = await settleArrangeWriteResult(result, apply);
    expect(outcome).toEqual({ status: 'needs_confirmation', result });
    expect(apply).not.toHaveBeenCalled();
  });

  it('passthrough direct writes', async () => {
    const apply = vi.fn();
    const result = { mode: 'direct' as const, tripId: 'trip-1', message: 'ok' };
    const outcome = await settleArrangeWriteResult(result, apply);
    expect(outcome).toEqual({ status: 'passthrough', result });
    expect(apply).not.toHaveBeenCalled();
  });
});
