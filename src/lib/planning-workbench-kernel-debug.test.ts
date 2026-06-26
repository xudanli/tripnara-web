import { describe, expect, it } from 'vitest';
import { pickPlanStateKernelDebug } from '@/lib/planning-workbench-kernel-debug';

describe('pickPlanStateKernelDebug', () => {
  it('extracts kernelBridge and gate mismatch from snake_case metadata', () => {
    const debug = pickPlanStateKernelDebug({
      kernel_bridge: {
        decision_os_audit: { mode: 'shadow' },
        shadow_diff: { recommendationChanged: true },
      },
      kernel_compare_gate_mismatch: {
        llm_recommended: 'opt-a',
        gate_recommended: 'opt-b',
      },
    });

    expect(debug?.kernelBridge?.decisionOsAudit).toEqual({ mode: 'shadow' });
    expect(debug?.kernelBridge?.shadowDiff).toEqual({ recommendationChanged: true });
    expect(debug?.kernelCompareGateMismatch).toEqual({
      llmRecommended: 'opt-a',
      gateRecommended: 'opt-b',
    });
  });

  it('returns undefined when no kernel fields', () => {
    expect(pickPlanStateKernelDebug({ foo: 'bar' })).toBeUndefined();
    expect(pickPlanStateKernelDebug(null)).toBeUndefined();
  });
});
