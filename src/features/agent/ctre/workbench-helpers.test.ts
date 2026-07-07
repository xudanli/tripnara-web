import { describe, expect, it } from 'vitest';
import {
  extractWorkbenchCtreFromTaskStatus,
  getKernelVerifyRepairTerminatedLabel,
  normalizeWorkbenchCtreUi,
  resolveWorkbenchVerifyRepairRoundDetails,
  shouldShowWorkbenchVerifyRepairPanel,
} from './workbench-helpers';

describe('workbench ctre helpers', () => {
  it('normalizes kernelVerifyRepairLoop roundDetails', () => {
    const ctre = normalizeWorkbenchCtreUi({
      progress: { compileId: 'c1', status: 'partial', score: 88, engine: 'CTRE' },
      kernelVerifyRepairLoop: {
        terminatedReason: 'clean',
        repairCount: 1,
        maxRepairs: 2,
        roundDetails: [
          {
            round: 0,
            verify: {
              issueCount: 1,
              fatalCount: 0,
              conflictCount: 1,
              advisoryCount: 0,
              issues: [{ code: 'TIME_WINDOW_OVERLAP', class: 'CONFLICT', message: 'overlap' }],
            },
            repair: { applied: true, segmentsUpdated: 1, itemsApplied: 2 },
            recompile: { status: 'partial', score: 86, incrementalMerged: true, affectedDayIndices: [0] },
          },
          {
            round: 1,
            verify: { issueCount: 0, fatalCount: 0, conflictCount: 0, advisoryCount: 0, issues: [] },
          },
        ],
      },
    });

    expect(ctre?.kernelVerifyRepairLoop?.terminatedReason).toBe('clean');
    expect(ctre?.kernelVerifyRepairLoop?.roundDetails).toHaveLength(2);
    expect(getKernelVerifyRepairTerminatedLabel('clean')).toBe('验证通过');
  });

  it('falls back to kernelVerify when roundDetails missing', () => {
    const ctre = normalizeWorkbenchCtreUi({
      kernelVerify: { issueCount: 2, fatalCount: 0, conflictCount: 1 },
      kernelRepair: { applied: true, segmentsUpdated: 1, itemsApplied: 1 },
      kernelReVerify: { issueCount: 0, fatalCount: 0, conflictCount: 0 },
    });
    expect(ctre).not.toBeNull();
    const rounds = resolveWorkbenchVerifyRepairRoundDetails(ctre!);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].round).toBe(0);
    expect(rounds[1].round).toBe(1);
  });

  it('hides panel when skipped', () => {
    expect(shouldShowWorkbenchVerifyRepairPanel({ skipped: true })).toBe(false);
  });

  it('extracts ctre from task status projection', () => {
    const ctre = extractWorkbenchCtreFromTaskStatus({
      ctre: { progress: { compileId: 'x', status: 'success', score: 100, engine: 'CTRE' } },
    });
    expect(ctre?.progress?.compileId).toBe('x');
  });
});
