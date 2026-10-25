import { describe, expect, it } from 'vitest';
import {
  buildDecisionCaseBasisFacts,
  buildDecisionCaseWhatHappened,
  isBufferLikeDecisionBasisNarrative,
} from './decision-case-presentation.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

describe('decision-case-presentation.util', () => {
  const insurance: DecisionProblemSummary = {
    id: 'dc_insurance_trip',
    type: 'RISK',
    title: '选择哪种租车保险？',
    status: 'OPEN',
    primaryEnforcement: 'BLOCK',
    semanticKey: 'REQUIRED_CHOICE.RENTAL_INSURANCE',
    decisionCase: {
      sourceKind: 'REQUIRED_CHOICE',
      requiredness: 'BLOCKING',
      domain: 'INSURANCE',
      enrichmentStage: 'SHELL',
      writebackTargets: ['INSURANCE'],
      uiGroup: 'MUST_CONFIRM',
    },
  };

  it('builds insurance narrative instead of buffer text', () => {
    const text = buildDecisionCaseWhatHappened(insurance);
    expect(text).toMatch(/租车保险/);
    expect(text).not.toMatch(/盖希尔|Geysir|缓冲/);
  });

  it('builds insurance basis facts without road buffer metrics', () => {
    const facts = buildDecisionCaseBasisFacts(insurance);
    expect(facts.some((f) => f.label === '保险边界')).toBe(true);
    expect(facts.every((f) => !/缓冲|Geysir|盖希尔/i.test(f.text))).toBe(true);
  });

  it('detects buffer-like basis narrative', () => {
    expect(
      isBufferLikeDecisionBasisNarrative(
        '第2天 · 盖希尔 → 黄金瀑布（约 8.7 km）：预计通行 9 分钟，原计划仅留 21 分钟缓冲。',
      ),
    ).toBe(true);
    expect(isBufferLikeDecisionBasisNarrative('需确认租车保险档位')).toBe(false);
  });

  it('ignores buffer text wrongly attached on BFF description', () => {
    const text = buildDecisionCaseWhatHappened(insurance, {
      id: insurance.id,
      type: 'RISK',
      title: insurance.title,
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      description:
        '第2天 · 盖希尔 → 黄金瀑布（约 8.7 km）：预计通行 9 分钟，原计划仅留 21 分钟缓冲。',
      actions: [],
    } as never);
    expect(text).toMatch(/租车保险/);
    expect(text).not.toMatch(/盖希尔|Geysir/);
  });
});
