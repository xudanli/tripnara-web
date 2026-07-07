import { describe, expect, it } from 'vitest';
import {
  inspectorTabEmptyMessage,
  resolveInspectorTabDeferred,
} from '@/lib/planning-decision-inspector-empty.util';
import type { PlanningDecisionInspector } from '@/dto/frontend-planning-decision-inspector.types';

describe('inspectorTabEmptyMessage', () => {
  const inspector: PlanningDecisionInspector = {
    schema: 'tripnara.planning_decision_inspector@v1',
    tripId: 'trip-1',
    feasibility: {
      canSafelyWrite: false,
      headline: '尚未选定具体方案，暂无法评估写入可行性',
      gateChecks: [],
      executionSummary: [],
    },
    memberConsensus: {
      assessment: { statusMessage: '选定方案后可查看成员共识' },
      opinions: [],
      aiSummary: [],
    },
  };

  it('uses BFF headline for feasibility empty message', () => {
    expect(inspectorTabEmptyMessage('feasibility', inspector)).toContain('尚未选定');
  });

  it('uses assessment message for member consensus', () => {
    expect(inspectorTabEmptyMessage('memberConsensus', inspector)).toBe(
      '选定方案后可查看成员共识',
    );
  });

  it('does not treat deferred planDiff as empty when preview is loading', () => {
    expect(
      resolveInspectorTabDeferred('planDiff', { planDiff: true }, {
        hasSelection: true,
        isLoading: true,
      }),
    ).toBe(false);
  });

  it('uses selection-specific planDiff empty copy', () => {
    expect(
      inspectorTabEmptyMessage('planDiff', inspector, undefined, { hasSelection: true }),
    ).toContain('当前方案');
  });

  it('prompts to select option before planDiff when nothing selected', () => {
    expect(inspectorTabEmptyMessage('planDiff', inspector, undefined, { hasSelection: false })).toBe(
      '请先选择方案',
    );
  });
});
