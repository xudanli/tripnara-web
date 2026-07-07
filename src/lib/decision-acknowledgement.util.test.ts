import { describe, expect, it } from 'vitest';
import { DecisionSemanticsApiError } from '@/api/decision-problems';
import {
  areDecisionAcknowledgementsComplete,
  isDecisionAcknowledgementRequiredError,
  resolveDecisionAcknowledgementRequired,
  resolvePreviewAcknowledgementRequired,
} from './decision-acknowledgement.util';

describe('decision-acknowledgement.util', () => {
  it('detects acknowledgement required errors', () => {
    expect(
      isDecisionAcknowledgementRequiredError(
        new DecisionSemanticsApiError('DECISION_ACKNOWLEDGEMENT_REQUIRED', 'VALIDATION_ERROR'),
      ),
    ).toBe(true);
    expect(
      isDecisionAcknowledgementRequiredError(new Error('DECISION_ACKNOWLEDGEMENT_REQUIRED')),
    ).toBe(true);
  });

  it('checks acknowledgement completion', () => {
    expect(areDecisionAcknowledgementsComplete([], ['a'])).toBe(true);
    expect(areDecisionAcknowledgementsComplete(['a', 'b'], ['a'])).toBe(false);
    expect(areDecisionAcknowledgementsComplete(['a'], ['a'])).toBe(true);
  });

  it('uses preview requiredAcknowledgements verbatim', () => {
    const ack = '我确认在了解阻断原因后仍执行该方案';
    expect(
      resolvePreviewAcknowledgementRequired({
        optionId: 'option-1',
        requiredAcknowledgements: [ack],
      }),
    ).toEqual([ack]);
    expect(
      resolveDecisionAcknowledgementRequired({
        preview: { optionId: 'option-1', requiredAcknowledgements: [ack] },
      }),
    ).toEqual([ack]);
    expect(
      resolveDecisionAcknowledgementRequired({
        preview: { optionId: 'option-1', requiredAcknowledgements: [ack] },
        action: { actionId: 'a', label: 'x', allowed: true, summary: '不应使用摘要' },
      }),
    ).toEqual([ack]);
  });

  it('falls back to action summary only when preview not loaded', () => {
    expect(
      resolveDecisionAcknowledgementRequired({
        action: { actionId: 'a', label: '午餐窗后移', allowed: true, summary: '午餐窗后移 30 分钟' },
      }),
    ).toEqual(['我已了解：午餐窗后移 30 分钟']);

    expect(
      resolveDecisionAcknowledgementRequired({
        preview: {
          tradeoffs: [{ dimension: 'TIME', direction: 'WORSEN', explanation: '后续游览压缩' }],
        } as import('@/types/decision-problem').DecisionOptionPreviewResponse,
      }),
    ).toEqual(['我已了解：后续游览压缩']);

    expect(
      resolveDecisionAcknowledgementRequired({
        preview: {
          optionId: 'a',
          tradeoffs: [{ dimension: 'POI', direction: 'IMPROVE', explanation: '确认营业时间' }],
        },
        includeAllTradeoffs: true,
      }),
    ).toEqual([]);

    expect(
      resolveDecisionAcknowledgementRequired({
        serverRequired: ['我已了解：后端指定文案'],
        preview: { optionId: 'a', tradeoffs: [{ dimension: 'TIME', direction: 'WORSEN', explanation: 'x' }] },
      }),
    ).toEqual(['我已了解：后端指定文案']);

    expect(
      resolveDecisionAcknowledgementRequired({ forceFallback: true }),
    ).toEqual(['我已了解该方案对行程与时间的影响，确认应用到行程']);
  });
});
