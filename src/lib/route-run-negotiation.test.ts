import { describe, expect, it } from 'vitest';
import {
  resolveDecisionStripNegotiationPresentation,
  resolveDecisionStripPrimaryCta,
} from '@/lib/decision-strip-model';

describe('route run negotiation strip integration', () => {
  it('prioritizes open_negotiation CTA when negotiation is pending', () => {
    const cta = resolveDecisionStripPrimaryCta({
      guards: null,
      compareSummary: null,
      hasBlockGuard: false,
      needNegotiation: { negotiationSessionId: 'neg-1', impact: 'Day 2 需改线' },
    });
    expect(cta.type).toBe('open_negotiation');
  });

  it('keeps compare CTA ahead of negotiation', () => {
    const cta = resolveDecisionStripPrimaryCta({
      guards: null,
      compareSummary: {
        recommendedOptionId: 'opt-a',
        reason: '推荐 A',
        divergesFromLlm: false,
        optionCount: 2,
      },
      hasBlockGuard: false,
      needNegotiation: { negotiationSessionId: 'neg-1' },
    });
    expect(cta.type).toBe('open_plan_gate');
  });

  it('keeps confirmation CTA ahead of negotiation', () => {
    const cta = resolveDecisionStripPrimaryCta({
      guards: null,
      compareSummary: null,
      hasBlockGuard: false,
      needConfirmation: { approvalId: 'appr-1' },
      needNegotiation: { negotiationSessionId: 'neg-1' },
    });
    expect(cta.type).toBe('confirm_continue');
  });

  it('builds blocked presentation from negotiation impact', () => {
    const presentation = resolveDecisionStripNegotiationPresentation({
      impact: 'Day 2 交通窗口冲突',
      reason: '高铁班次不足',
      recommendationSummary: '建议改乘飞机',
    });
    expect(presentation.headline).toBe('Day 2 交通窗口冲突');
    expect(presentation.subline).toBe('建议改乘飞机');
    expect(presentation.state).toBe('blocked');
  });
});
