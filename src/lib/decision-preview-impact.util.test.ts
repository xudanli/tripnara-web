import { describe, expect, it } from 'vitest';
import { mergePreviewIntoDecisionCheckerImpact } from './decision-preview-impact.util';
import type { DecisionCheckerImpactDto } from '@/types/decision-checker';

const emptyImpact: DecisionCheckerImpactDto = {
  summary: {
    experienceCompletion: { value: '-14%', tone: 'bad' },
  },
  constraints: [],
  cascade: [],
};

describe('mergePreviewIntoDecisionCheckerImpact', () => {
  it('overrides summary from preview tradeoffs and adds mutation cascade', () => {
    const merged = mergePreviewIntoDecisionCheckerImpact(emptyImpact, {
      optionId: 'shift_next',
      tradeoffs: [
        {
          dimension: 'POI_COVERAGE',
          direction: 'WORSEN',
          value: 86,
          unit: 'PERCENT',
          explanation: '核心体验保留 86% (-14%)',
        },
        {
          dimension: 'FATIGUE',
          direction: 'IMPROVE',
          explanation: '当日疲劳负荷略降',
        },
      ],
      proposedMutations: {
        operations: [
          {
            label: '调整下一项',
            description: '2026-08-01T11:33:00.000+00:00 · 斯科加瀑布',
          },
        ],
      },
      impactSummary: '顺延下一项开始时间，补足转场缓冲。',
    }, 'Atlantic/Reykjavik');

    expect(merged.summary.experienceCompletion?.value).toContain('86%');
    expect(merged.cascade.some((node) => node.title.includes('疲劳'))).toBe(true);
    expect(merged.cascade.some((node) => node.description.includes('8月1日'))).toBe(true);
    expect(merged.aiInterpretation?.text).toContain('顺延下一项');
  });

  it('returns base impact when preview is absent', () => {
    expect(mergePreviewIntoDecisionCheckerImpact(emptyImpact, null)).toBe(emptyImpact);
  });
});
