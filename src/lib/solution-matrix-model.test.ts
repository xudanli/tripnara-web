import { describe, expect, it } from 'vitest';
import type { OptionComparison } from '@/api/planning-workbench';
import {
  buildSolutionMatrixModel,
  pickDefaultSelectedOptionId,
  sliceSolutionMatrixRows,
} from '@/lib/solution-matrix-model';

describe('buildSolutionMatrixModel', () => {
  const comparison: OptionComparison = {
    options: [
      { optionId: 'opt-a', scores: { executability: 70, cost: 80, risk: 60 } },
      { optionId: 'opt-b', scores: { executability: 85, cost: 75, risk: 55 } },
    ],
    recommendation: { optionId: 'opt-b', reason: '平衡成本与可执行性' },
    kernelGateEval: {
      divergesFromLlmRecommendation: true,
      llmRecommendedOptionId: 'opt-a',
      optionDeltas: [
        { optionId: 'opt-b', gateStatus: 'ALLOW', violationCount: 0, violationTypes: [] },
        { optionId: 'opt-a', gateStatus: 'NEED_CONFIRM', violationCount: 1, violationTypes: ['budget'] },
      ],
    },
  };

  it('returns visible matrix for two options', () => {
    const model = buildSolutionMatrixModel(comparison);
    expect(model.visible).toBe(true);
    expect(model.columns).toHaveLength(2);
    expect(model.columns[0]?.optionId).toBe('opt-b');
    expect(model.columns[0]?.isRecommended).toBe(true);
    expect(model.divergesFromLlm).toBe(true);
  });

  it('hides matrix for single option', () => {
    expect(
      buildSolutionMatrixModel({
        options: [{ optionId: 'opt-a' }],
        recommendation: { optionId: 'opt-a', reason: '唯一方案' },
      }).visible,
    ).toBe(false);
  });

  it('builds diff tones relative to recommended column', () => {
    const model = buildSolutionMatrixModel(comparison);
    const riskRow = model.rows.find((r) => r.dimensionId === 'risk');
    expect(riskRow?.cells[0]?.diffTone).toBe('same');
    expect(riskRow?.cells[1]?.diffTone).toBe('worse');
  });

  it('limits to three columns', () => {
    const many: OptionComparison = {
      options: [
        { optionId: 'a' },
        { optionId: 'b' },
        { optionId: 'c' },
        { optionId: 'd' },
      ],
      recommendation: { optionId: 'a', reason: 'test' },
    };
    expect(buildSolutionMatrixModel(many).columns).toHaveLength(3);
  });
});

describe('pickDefaultSelectedOptionId', () => {
  it('prefers recommended option', () => {
    const model = buildSolutionMatrixModel({
      options: [{ optionId: 'a' }, { optionId: 'b' }],
      recommendation: { optionId: 'b', reason: 'x' },
    });
    expect(pickDefaultSelectedOptionId(model)).toBe('b');
  });
});

describe('sliceSolutionMatrixRows', () => {
  it('returns first three rows when collapsed', () => {
    const model = buildSolutionMatrixModel({
      options: [
        { optionId: 'a', scores: { executability: 1, cost: 2, fatigue: 3, risk: 4 } },
        { optionId: 'b', scores: { executability: 2, cost: 3, fatigue: 4, risk: 5 } },
      ],
      recommendation: { optionId: 'a', reason: 'x' },
    });
    expect(sliceSolutionMatrixRows(model.rows, false).length).toBe(3);
    expect(sliceSolutionMatrixRows(model.rows, true).length).toBe(model.rows.length);
  });
});
