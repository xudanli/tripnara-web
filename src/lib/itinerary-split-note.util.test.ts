import { describe, expect, it } from 'vitest';
import {
  ITINERARY_SPLIT_PLAN_NOTE_PREFIX,
  formatItinerarySplitGroupLabel,
  hasItinerarySplitPlanNote,
  parseItinerarySplitPlanNote,
  stripSplitPlanNoteLines,
} from './itinerary-split-note.util';

describe('itinerary-split-note.util', () => {
  it('parses v1 JSON marker', () => {
    const note = `${ITINERARY_SPLIT_PLAN_NOTE_PREFIX}{"groupId":"grp_a","groupLabel":"年轻组","phase":"branch","splitPlanId":"sp1"}\n冰川徒步`;
    expect(parseItinerarySplitPlanNote(note)).toEqual({
      splitPlanId: 'sp1',
      groupId: 'grp_a',
      groupLabel: '年轻组',
      letter: undefined,
      phase: 'branch',
    });
    expect(stripSplitPlanNoteLines(note)).toBe('冰川徒步');
    expect(hasItinerarySplitPlanNote(note)).toBe(true);
  });

  it('parses legacy [分流:A|branch] marker', () => {
    const note = '[分流:A|branch]\n咖啡店休息';
    expect(parseItinerarySplitPlanNote(note)?.letter).toBe('A');
    expect(parseItinerarySplitPlanNote(note)?.phase).toBe('branch');
    expect(formatItinerarySplitGroupLabel(parseItinerarySplitPlanNote(note)!)).toBe('分组 A');
  });

  it('returns null for plain notes', () => {
    expect(parseItinerarySplitPlanNote('普通备注')).toBeNull();
    expect(hasItinerarySplitPlanNote('[必游] 核心景点')).toBe(false);
  });
});
