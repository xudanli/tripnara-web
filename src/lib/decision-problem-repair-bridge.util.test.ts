import { describe, expect, it, vi, beforeEach } from 'vitest';
import { decisionProblemsApi } from '@/api/decision-problems';
import { resolveLedgerNodeDecisionId } from '@/lib/decision-ledger-node-decision.util';
import {
  mapDecisionPreviewToRepairPreview,
  resolveExecuteFlagForCapability,
} from '@/lib/decision-problem-repair-bridge.util';

vi.mock('@/api/decision-problems', () => ({
  decisionProblemsApi: {
    getDecisionByLedgerNode: vi.fn(),
    isNotImplemented: vi.fn(() => false),
  },
}));

describe('decision-problem-repair-bridge.util', () => {
  it('maps decision preview to feasibility repair preview', () => {
    const preview = mapDecisionPreviewToRepairPreview(
      {
        optionId: 'gate_reach_alt_route',
        executionCapability: 'DIRECT',
        proposedMutations: {
          operations: [{ label: '换路线至备用通道' }],
        },
      },
      { id: 'gate_reach_alt_route', label: '换路线' },
    );
    expect(preview.status).toBe('preview');
    expect(preview.message).toContain('换路线');
  });

  it('resolves execute flag from capability', () => {
    expect(resolveExecuteFlagForCapability(undefined, 'DIRECT')).toBe(true);
    expect(resolveExecuteFlagForCapability(undefined, 'GUIDED_MANUAL')).toBe(false);
  });
});

describe('resolveLedgerNodeDecisionId', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.getDecisionByLedgerNode).mockReset();
  });

  it('prefers API decision id', async () => {
    vi.mocked(decisionProblemsApi.getDecisionByLedgerNode).mockResolvedValue({
      decisionId: 'dec_api',
    });
    await expect(resolveLedgerNodeDecisionId('trip_1', 'POI_X', null)).resolves.toBe('dec_api');
  });

  it('falls back to causality map', async () => {
    vi.mocked(decisionProblemsApi.getDecisionByLedgerNode).mockRejectedValue(new Error('404'));
    vi.mocked(decisionProblemsApi.isNotImplemented).mockReturnValue(false);
    await expect(
      resolveLedgerNodeDecisionId('trip_1', 'POI_X', {
        ledgerNodeToDecisionId: { POI_X: 'dec_local' },
        links: [],
        source: 'memory_console',
      }),
    ).resolves.toBe('dec_local');
  });
});
