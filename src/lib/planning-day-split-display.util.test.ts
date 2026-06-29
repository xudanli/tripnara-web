import { describe, expect, it } from 'vitest';
import {
  groupShortLabel,
  parseGroupLabel,
  resolveBranchMembers,
  resolveSegmentPoiTitle,
  segmentHighlightsExcludingSubtitle,
  segmentSubtitle,
} from '@/lib/planning-day-split-display.util';
import type { PlanningDaySplitBranchDto } from '@/types/planning-day-split';

describe('planning-day-split-display.util', () => {
  it('prefers placeName for POI title', () => {
    expect(
      resolveSegmentPoiTitle({
        id: '1',
        kind: 'branch',
        startTime: '11:00',
        title: '冰川徒步体验',
        placeName: 'Sólheimajökull 冰川',
      }),
    ).toBe('Sólheimajökull 冰川');
  });

  it('resolves members from branch.members', () => {
    const branch = {
      id: 'b1',
      groupId: 'g1',
      groupLabel: '年轻组',
      memberCount: 2,
      members: [
        { id: 'u1', displayName: 'danli xu' },
        { id: 'u2', displayName: 'Danny' },
      ],
      segments: [],
    } satisfies PlanningDaySplitBranchDto;

    expect(resolveBranchMembers(branch)).toEqual([
      { id: 'u1', displayName: 'danli xu' },
      { id: 'u2', displayName: 'Danny' },
    ]);
  });

  it('returns empty when members missing (no client groupLabel fallback)', () => {
    const branch = {
      id: 'b1',
      groupId: 'g1',
      groupLabel: 'danli xu',
      memberCount: 1,
      segments: [],
    } satisfies PlanningDaySplitBranchDto;

    expect(resolveBranchMembers(branch)).toEqual([]);
  });

  it('parses BFF groupLabel with member summary and trait', () => {
    expect(parseGroupLabel('Alice、Bob 等 8 人 · 体能较好')).toEqual({
      memberSummary: 'Alice、Bob 等 8 人',
      trait: '体能较好',
    });
  });

  it('parses short group label', () => {
    expect(groupShortLabel('Group A · 年轻组')).toBe('年轻组');
  });

  it('drops highlights that duplicate subtitle', () => {
    const segment = {
      id: '1',
      kind: 'branch' as const,
      startTime: '11:00',
      title: '冰川徒步体验',
      placeName: 'Sólheimajökull 冰川',
      subtitle: 'Vík, Iceland',
      highlights: ['Vík, Iceland', '需向导陪同'],
    };

    expect(segmentSubtitle(segment)).toBe('Vík, Iceland');
    expect(segmentHighlightsExcludingSubtitle(segment)).toEqual(['需向导陪同']);
  });

  it('dedupes highlights and ignores whitespace-only entries', () => {
    const segment = {
      id: '2',
      kind: 'branch' as const,
      startTime: '12:00',
      title: '黑沙滩',
      highlights: ['  同一地址  ', '同一地址', ''],
    };

    expect(segmentHighlightsExcludingSubtitle(segment)).toEqual(['同一地址']);
  });
});
