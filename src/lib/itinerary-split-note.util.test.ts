import { describe, expect, it } from 'vitest';
import {
  ITINERARY_SPLIT_PLAN_NOTE_PREFIX,
  formatItinerarySplitGroupLabel,
  hasItinerarySplitPlanNote,
  mergeSplitPlanNoteIntoNote,
  parseItinerarySplitPlanNote,
  resolveItineraryParticipantIds,
  sanitizeSplitPlanTextForDisplay,
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

  it('parses memberIds and merges notes', () => {
    const note = `${ITINERARY_SPLIT_PLAN_NOTE_PREFIX}{"phase":"branch","letter":"A","memberIds":["u1","u2"],"source":"manual"}\n备注`;
    expect(parseItinerarySplitPlanNote(note)?.memberIds).toEqual(['u1', 'u2']);
    expect(mergeSplitPlanNoteIntoNote('正文', {
      phase: 'branch',
      letter: 'B',
      memberIds: ['u3'],
      source: 'manual',
    })).toContain('"memberIds":["u3"]');
    expect(resolveItineraryParticipantIds({ note })).toEqual(['u1', 'u2']);
  });

  it('sanitizes raw split markers in user-facing text', () => {
    const raw =
      '新增: [split_plan:v1]{"splitPlanId":"manual_1","groupId":"grp_b","groupLabel":"分组 B","letter":"B","phase":"branch","memberIds":["u1"],"source":"manual"}';
    expect(sanitizeSplitPlanTextForDisplay(raw)).toBe('新增: 分流 · 分组 B · 1 人');
    expect(sanitizeSplitPlanTextForDisplay(raw)).not.toContain('split_plan');
    expect(sanitizeSplitPlanTextForDisplay(raw)).not.toContain('{');
  });
});
