import { describe, expect, it } from 'vitest';
import {
  decisionActionConfirmLabel,
  decisionActionDisplayTitle,
  formatSuppressedActionsSummary,
  resolveDecisionResolutionActiveStep,
} from './decision-action-display.util';

describe('decision-action-display.util', () => {
  it('builds confirm label from title', () => {
    expect(decisionActionConfirmLabel({ title: '去官网预订', label: 'BOOK_NOW' })).toBe(
      '确认：去官网预订',
    );
  });

  it('summarizes multiple suppressed actions', () => {
    expect(
      formatSuppressedActionsSummary([
        { actionId: 'a', label: 'A', allowed: false },
        { actionId: 'b', label: 'B', allowed: false, blockedReason: '不可执行' },
      ]),
    ).toContain('2 条自动方案');
  });

  it('maps cta phase to step id', () => {
    expect(resolveDecisionResolutionActiveStep('select_action')).toBe('select');
    expect(resolveDecisionResolutionActiveStep('apply')).toBe('apply');
    expect(resolveDecisionResolutionActiveStep('done')).toBe('apply');
  });

  it('falls back to label for display title', () => {
    expect(decisionActionDisplayTitle({ label: '改期' })).toBe('改期');
  });
});
