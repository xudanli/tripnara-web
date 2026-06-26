import { describe, expect, it } from 'vitest';
import {
  buildDecisionStripCompareSummary,
  resolveDecisionStripPresentation,
} from '@/lib/decision-strip-model';
import type { OptionComparison } from '@/api/planning-workbench';

describe('buildDecisionStripCompareSummary', () => {
  it('maps recommendation and kernel divergence', () => {
    const comparison: OptionComparison = {
      options: [{ optionId: 'opt-a' }, { optionId: 'opt-b' }],
      recommendation: { optionId: 'opt-b', reason: '平衡成本与可执行性' },
      kernelGateEval: {
        divergesFromLlmRecommendation: true,
        llmRecommendedOptionId: 'opt-a',
        recommendedByGate: 'opt-b',
      },
    };

    expect(buildDecisionStripCompareSummary(comparison)).toEqual({
      recommendedOptionId: 'opt-b',
      reason: '平衡成本与可执行性',
      divergesFromLlm: true,
      llmRecommendedOptionId: 'opt-a',
      recommendedByGate: 'opt-b',
      optionCount: 2,
    });
  });
});

describe('resolveDecisionStripPresentation', () => {
  it('prioritizes compare recommendation headline', () => {
    const summary = buildDecisionStripCompareSummary({
      recommendation: { optionId: 'opt-b', reason: 'Kernel 推荐 opt-b' },
      options: [{ optionId: 'opt-a' }, { optionId: 'opt-b' }],
    });
    const out = resolveDecisionStripPresentation({
      guards: null,
      compareSummary: summary,
      personaLine: null,
    });
    expect(out.headline).toBe('Kernel 推荐 opt-b');
    expect(out.subline).toContain('opt-b');
    expect(out.state).toBe('conclusion');
  });
});
