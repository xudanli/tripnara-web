import { describe, expect, it } from 'vitest';
import {
  resolveDecisionStripNeedConfirmationPresentation,
  resolveDecisionStripPrimaryCta,
} from '@/lib/decision-strip-model';

describe('route run confirmation strip integration', () => {
  it('prioritizes confirm_continue CTA when approval is pending', () => {
    const cta = resolveDecisionStripPrimaryCta({
      guards: null,
      compareSummary: null,
      hasBlockGuard: false,
      needConfirmation: { approvalId: 'appr-1', summary: '将修改 Day 2 路线' },
    });
    expect(cta.type).toBe('confirm_continue');
  });

  it('keeps compare CTA ahead of confirmation', () => {
    const cta = resolveDecisionStripPrimaryCta({
      guards: null,
      compareSummary: {
        recommendedOptionId: 'opt-a',
        reason: '推荐 A',
        divergesFromLlm: false,
        optionCount: 2,
      },
      hasBlockGuard: false,
      needConfirmation: { approvalId: 'appr-1' },
    });
    expect(cta.type).toBe('open_plan_gate');
  });

  it('builds blocked presentation from suspension summary', () => {
    const presentation = resolveDecisionStripNeedConfirmationPresentation({
      summary: '将执行高风险改线',
      skillName: 'route_mutate',
    });
    expect(presentation.headline).toBe('将执行高风险改线');
    expect(presentation.state).toBe('blocked');
  });
});
