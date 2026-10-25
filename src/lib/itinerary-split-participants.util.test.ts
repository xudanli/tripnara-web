import { describe, expect, it } from 'vitest';
import {
  canAddParallelActivity,
  nextSplitLetter,
  remainingMemberIds,
} from './itinerary-split-participants.util';

describe('itinerary-split-participants.util', () => {
  it('computes remaining members', () => {
    expect(remainingMemberIds(['a', 'b', 'c'], ['a'])).toEqual(['b', 'c']);
  });

  it('allows parallel only for incomplete branch splits', () => {
    expect(
      canAddParallelActivity({
        phase: 'branch',
        totalMemberCount: 4,
        selectedMemberCount: 2,
      }),
    ).toBe(true);
    expect(
      canAddParallelActivity({
        phase: 'shared',
        totalMemberCount: 4,
        selectedMemberCount: 2,
      }),
    ).toBe(false);
    expect(
      canAddParallelActivity({
        phase: 'branch',
        totalMemberCount: 4,
        selectedMemberCount: 4,
      }),
    ).toBe(false);
  });

  it('picks next unused letter', () => {
    expect(nextSplitLetter(['A', 'B'])).toBe('C');
    expect(nextSplitLetter([])).toBe('A');
  });
});
