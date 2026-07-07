import { describe, expect, it } from 'vitest';
import {
  collectDestinationInsightEntries,
  normalizeTripDestinationInsightsResponse,
} from '@/api/destination-insight.types';
import { EVIDENCE_KIND_LABEL, resolveEvidenceKindIcon } from '@/lib/decision-checker-overview.util';
import { BookOpen } from 'lucide-react';

describe('normalizeTripDestinationInsightsResponse', () => {
  it('normalizes v1 bundle DTO with top-level insights array', () => {
    const normalized = normalizeTripDestinationInsightsResponse({
      schemaId: 'tripnara.destination_insight_bundle@v1',
      tripId: 'trip_1',
      focus: { conflictId: 'conflict_1' },
      insights: [
        {
          id: 'di_1',
          title: '道路风险',
          summary: 'RFC-001',
          sourceRefs: [{ system: 'FEASIBILITY', refId: 'conflict_1', label: '道路' }],
          explanatoryOnly: false,
        },
      ],
    });

    expect(normalized.focusConflictId).toBe('conflict_1');
    expect(collectDestinationInsightEntries(normalized)).toHaveLength(1);
    expect(collectDestinationInsightEntries(normalized)[0]?.title).toBe('道路风险');
  });

  it('splits RAG entries from v1 insights array into payload.rag', () => {
    const normalized = normalizeTripDestinationInsightsResponse({
      insights: [
        { id: 'a', title: '冲突', summary: '说明' },
        {
          id: 'rag_1',
          title: 'RAG tip',
          summary: 'blizzard',
          sourceRefs: [{ system: 'RAG', refId: 'rag_1' }],
        },
      ],
    });

    expect(collectDestinationInsightEntries(normalized)).toHaveLength(1);
    expect(normalized.insights.rag).toHaveLength(1);
    expect(normalized.insights.rag?.[0]?.title).toBe('RAG tip');
  });
});

describe('collectDestinationInsightEntries', () => {
  it('merges bundle.insights and payload.insights without duplicate ids', () => {
    const entries = collectDestinationInsightEntries({
      bundle: {
        insights: [
          { id: 'a', title: '准入', summary: '需预约' },
          { id: 'b', title: 'Plan B', summary: '备选路线' },
        ],
      },
      insights: {
        insights: [{ id: 'a', title: 'dup', summary: 'ignored' }],
        items: [{ title: 'legacy' }],
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.title).toBe('准入');
    expect(entries[1]?.title).toBe('Plan B');
  });
});

describe('decision-checker evidence kinds', () => {
  it('labels destination_knowledge', () => {
    expect(EVIDENCE_KIND_LABEL.destination_knowledge).toBe('目的地知识');
    expect(resolveEvidenceKindIcon('destination_knowledge')).toBe(BookOpen);
  });
});
