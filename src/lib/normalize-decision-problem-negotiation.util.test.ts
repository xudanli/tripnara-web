import { describe, expect, it } from 'vitest';
import {
  normalizeDecisionProblemNegotiationPreflightResponse,
  normalizeStartDecisionProblemNegotiationResponse,
  extractDecisionProblemNegotiationDetailFields,
} from './normalize-decision-problem-negotiation.util';

describe('normalize-decision-problem-negotiation.util', () => {
  it('normalizes start negotiation response', () => {
    const result = normalizeStartDecisionProblemNegotiationResponse({
      action: 'created',
      negotiationTaskId: 'nt:dp-1',
      clientNavigation: {
        roundId: 'round-1',
        roundDomain: 'activities',
      },
      prefill: {
        title: 'Day 3 冲突',
        options: [{ id: 'opt-a', label: '方案 A' }],
      },
    });

    expect(result.action).toBe('created');
    expect(result.negotiationTaskId).toBe('nt:dp-1');
    expect(result.clientNavigation).toEqual({
      roundId: 'round-1',
      roundDomain: 'activities',
    });
    expect(result.prefill?.title).toBe('Day 3 冲突');
  });

  it('normalizes preflight solo trip block', () => {
    const result = normalizeDecisionProblemNegotiationPreflightResponse({
      canStart: false,
      blockReason: 'SOLO_TRIP_NOT_SUPPORTED',
      blockMessageCN: '单人行程暂不支持团队协商',
      suggestedDomain: 'activities',
    });

    expect(result.canStart).toBe(false);
    expect(result.blockReason).toBe('SOLO_TRIP_NOT_SUPPORTED');
    expect(result.suggestedDomain).toBe('activities');
  });

  it('extracts negotiation projection from unified top-level and legacy inner data', () => {
    const unified = extractDecisionProblemNegotiationDetailFields({
      flow: 'LEGACY_V15',
      suggestedNegotiationDomain: 'dining',
      negotiation: { buttonLabel: '进入协商', roundId: 'round-9', status: 'in_discussion' },
      data: { id: 'dp-1', title: 'test' },
    });
    expect(unified.suggestedNegotiationDomain).toBe('dining');
    expect(unified.negotiation?.roundId).toBe('round-9');

    const legacy = extractDecisionProblemNegotiationDetailFields({
      id: 'dp-2',
      suggestedNegotiationDomain: 'accommodation',
      negotiation: {
        buttonLabel: null,
        status: 'closed',
        closedOutcome: { summaryCN: '团队倾向方案 A', recommendedOptionId: 'opt-a' },
      },
    });
    expect(legacy.negotiation?.buttonLabel).toBeNull();
    expect(legacy.negotiation?.closedOutcome?.recommendedOptionId).toBe('opt-a');
  });

  it('normalizes negotiation.visible', () => {
    const fields = extractDecisionProblemNegotiationDetailFields({
      negotiation: { visible: false, buttonLabel: '发起协商' },
    });
    expect(fields.negotiation?.visible).toBe(false);

    const open = extractDecisionProblemNegotiationDetailFields({
      negotiation: { visible: true, buttonLabel: '进入协商', status: 'in_discussion' },
    });
    expect(open.negotiation?.visible).toBe(true);
  });

  it('normalizes PROBLEM_NOT_ELIGIBLE preflight', () => {
    const result = normalizeDecisionProblemNegotiationPreflightResponse({
      canStart: false,
      blockReason: 'PROBLEM_NOT_ELIGIBLE',
      blockMessageCN: '预约类问题不支持结构化协商',
    });
    expect(result.blockReason).toBe('PROBLEM_NOT_ELIGIBLE');
  });
});
