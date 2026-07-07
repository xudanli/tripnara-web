import { describe, expect, it } from 'vitest';
import {
  pickPrimaryTradeoffRow,
  resolvePersonaAlertTradeoffSummary,
  resolveTradeoffRowSummary,
} from './tradeoff-display.util';

describe('tradeoff-display.util', () => {
  it('prefers contextualNarrative over explanation', () => {
    expect(
      resolveTradeoffRowSummary({
        explanation: '雷尼斯黑沙滩：官方规则已超过 14 天未核验',
        contextualNarrative:
          '你们 Day 2 下午计划去雷尼斯黑沙滩，但官方潮汐/禁入规则已 14 天未更新。建议出发前再确认。',
      }),
    ).toBe(
      '你们 Day 2 下午计划去雷尼斯黑沙滩，但官方潮汐/禁入规则已 14 天未更新。建议出发前再确认。',
    );
  });

  it('falls back to explanation when narrative missing', () => {
    expect(resolveTradeoffRowSummary({ explanation: '短摘要' })).toBe('短摘要');
  });

  it('picks WORSEN row for persona alert summary', () => {
    const summary = resolvePersonaAlertTradeoffSummary([
      { dimension: 'POI_COVERAGE', direction: 'IMPROVE', explanation: '体验保留 92%' },
      {
        dimension: 'SAFETY',
        direction: 'WORSEN',
        explanation: '规则未核验',
        contextualNarrative: 'Day 2 黑沙滩规则已 14 天未更新，建议出发前再确认。',
      },
    ]);
    expect(summary).toContain('Day 2 黑沙滩');
  });

  it('pickPrimaryTradeoffRow orders by severity', () => {
    const primary = pickPrimaryTradeoffRow([
      { direction: 'IMPROVE' },
      { direction: 'UNCHANGED' },
      { direction: 'WORSEN' },
    ]);
    expect(primary?.direction).toBe('WORSEN');
  });
});
