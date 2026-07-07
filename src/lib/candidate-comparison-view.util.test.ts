import { describe, expect, it } from 'vitest';
import {
  extractComparisonViewFromPayload,
  normalizeCandidateComparisonView,
} from '@/lib/candidate-comparison-view.util';

describe('candidate-comparison-view.util', () => {
  it('normalizes comparisonView with intent, rows, and rejections', () => {
    const view = normalizeCandidateComparisonView({
      schemaId: 'tripnara.candidate_comparison@v1',
      originalIntent: {
        labels: ['可完成的日行程节奏'],
        narrative: '你选择此行的核心原因是…',
      },
      recommendedCandidateId: 'cand_split_day',
      headline: '推荐方案 B：拆分超载日',
      rows: [
        {
          schemeLabel: 'A',
          candidateId: 'original',
          title: '维持原计划',
          recommended: false,
          selectable: false,
          safety: { status: 'FAIL', label: '不通过' },
          pace: {
            status: 'OVERLOADED',
            label: '高风险',
            note: '第 5 日驾驶负荷过高',
          },
          experienceRetentionLabel: '100%',
          cost: { label: '¥0' },
        },
        {
          schemeLabel: 'B',
          candidateId: 'cand_split_day',
          title: '拆分超载日',
          recommended: true,
          safety: { label: '需确认' },
          pace: { label: '中等', note: '将部分活动移至第 6 日' },
          experienceRetentionLabel: '82%',
          cost: { label: '¥0' },
        },
      ],
      rejections: [
        {
          candidateId: 'original',
          message: '原计划…因此没有被推荐。',
        },
      ],
    });

    expect(view?.schemaId).toBe('tripnara.candidate_comparison@v1');
    expect(view?.originalIntent?.labels).toEqual(['可完成的日行程节奏']);
    expect(view?.rows).toHaveLength(2);
    expect(view?.rows[1].experienceRetentionLabel).toBe('82%');
    expect(view?.rejections?.[0].message).toContain('没有被推荐');
  });

  it('extracts comparisonView from gateway data payload', () => {
    const view = extractComparisonViewFromPayload({
      options: [],
      comparisonView: {
        rows: [
          {
            schemeLabel: 'A',
            candidateId: 'a',
            title: '方案 A',
          },
        ],
      },
    });
    expect(view?.rows[0].candidateId).toBe('a');
  });

  it('returns null when rows are empty', () => {
    expect(normalizeCandidateComparisonView({ rows: [] })).toBeNull();
  });
});
