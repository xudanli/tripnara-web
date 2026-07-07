import { describe, expect, it } from 'vitest';
import {
  buildDecisionRecommendationRationale,
  collectOriginalPlanJudgmentLines,
  decisionClosureStatusForPhase,
  isSameDecisionNarrativeText,
  resolveRecommendedDecisionOption,
} from '@/lib/decision-closure-card.util';
import type { DecisionOption, DecisionProblemDetail } from '@/types/decision-problem';

describe('decision-closure-card.util', () => {
  it('maps AWAITING_AUTHORIZE to user-facing 需要你确认', () => {
    const status = decisionClosureStatusForPhase({
      l2Phase: 'AWAITING_AUTHORIZE',
      planVersionStatus: 'PENDING_AUTHORIZATION',
    });
    expect(status.label).toBe('需要你确认');
    expect(status.sublabel).toContain('不会修改');
  });

  it('prefers POI_COVERAGE + SAFETY when picking recommended option', () => {
    const options: DecisionOption[] = [
      {
        id: 'b',
        label: '方案 B',
        tradeoffs: [{ dimension: 'FATIGUE', direction: 'WORSEN', explanation: '负荷高' }],
      },
      {
        id: 'a',
        label: '方案 A',
        tradeoffs: [
          { dimension: 'POI_COVERAGE', direction: 'IMPROVE', explanation: '体验保留 92%' },
          { dimension: 'SAFETY', direction: 'IMPROVE', explanation: '安全通过' },
        ],
      },
    ];
    expect(resolveRecommendedDecisionOption(options)?.id).toBe('a');
  });

  it('builds rationale from tradeoffs not persona names', () => {
    const rationale = buildDecisionRecommendationRationale({
      id: 'a',
      label: '方案 A',
      tradeoffs: [
        { dimension: 'SAFETY', direction: 'IMPROVE', explanation: '安全约束通过' },
        { dimension: 'POI_COVERAGE', direction: 'IMPROVE', explanation: '核心体验保留 92%' },
        { dimension: 'COST', direction: 'IMPROVE', value: 0, explanation: '无新增费用' },
      ],
    });
    expect(rationale).toContain('安全约束通过');
    expect(rationale).toContain('92%');
    expect(rationale).not.toMatch(/Abu|Neptune|Dr\.Dre/i);
  });

  it('collects failed assertions as original plan judgment', () => {
    const detail: DecisionProblemDetail = {
      id: 'p1',
      type: 'INFEASIBILITY',
      title: 'test',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      assertions: [
        { passed: false, message: '可行性证据不足' },
        { passed: true, message: 'ignored' },
      ],
    };
    expect(collectOriginalPlanJudgmentLines(detail)).toEqual(['可行性证据不足']);
  });

  it('prefers record.selectedCandidateId over tradeoff scoring', () => {
    const options: DecisionOption[] = [
      {
        id: 'b',
        label: '方案 B',
        tradeoffs: [{ dimension: 'POI_COVERAGE', direction: 'IMPROVE', explanation: '高' }],
      },
      { id: 'a', label: '方案 A' },
    ];
    expect(resolveRecommendedDecisionOption(options, 'a')?.id).toBe('a');
  });

  it('detects duplicate decision narrative text', () => {
    expect(isSameDecisionNarrativeText('a', 'a')).toBe(true);
    expect(isSameDecisionNarrativeText('Day 5 · foo', 'foo')).toBe(true);
    expect(isSameDecisionNarrativeText('a', 'b')).toBe(false);
  });
});
