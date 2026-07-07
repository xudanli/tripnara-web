import { describe, expect, it } from 'vitest';
import {
  TRIP_DETAIL_TERMS,
  formatSuggestedConfirmSubtext,
  formatTimelinePendingSubtext,
} from './trip-detail-terminology.util';
import { evidenceRefsSuggestTripFiles } from './trip-detail-evidence-files.util';

describe('trip-detail-terminology.util', () => {
  it('distinguishes open decision vs suggested confirm', () => {
    expect(TRIP_DETAIL_TERMS.openDecision.short).toBe('待你决定');
    expect(TRIP_DETAIL_TERMS.suggestedConfirm.short).toBe('建议确认');
    expect(TRIP_DETAIL_TERMS.openDecision.short).not.toBe(TRIP_DETAIL_TERMS.suggestedConfirm.short);
  });

  it('formats suggested confirm subtext', () => {
    expect(formatSuggestedConfirmSubtext(0)).toBe('暂无待处理');
    expect(formatSuggestedConfirmSubtext(3)).toBe('3 项建议确认');
  });

  it('formats timeline pending subtext with files', () => {
    expect(
      formatTimelinePendingSubtext({
        pendingConfirmationCount: 2,
        conflictCount: 1,
        filesPendingCount: 4,
      }),
    ).toBe('2 项建议确认 · 1 项冲突 · 4 份待补充');
  });
});

describe('trip-detail-evidence-files.util', () => {
  it('detects file-related evidence refs', () => {
    expect(evidenceRefsSuggestTripFiles(['ontology:region:IS:foo'])).toBe(false);
    expect(evidenceRefsSuggestTripFiles(['trip_file:abc', 'rag:chunk'])).toBe(true);
  });
});
