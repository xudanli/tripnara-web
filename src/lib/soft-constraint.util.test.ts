import { describe, expect, it } from 'vitest';
import {
  resolveSoftTemplateDefaultPriority,
  softPriorityRank,
  sortSoftEntriesByPriority,
} from './soft-constraint.util';

function sliderToPriority(value: number): '高' | '中' | '低' {
  if (value >= 67) return '高';
  if (value >= 34) return '中';
  return '低';
}

describe('soft-constraint.util', () => {
  it('assigns default priority for hotel and budget soft templates', () => {
    expect(resolveSoftTemplateDefaultPriority('minimize_hotel_changes')).toBe('高');
    expect(resolveSoftTemplateDefaultPriority('budget_soft')).toBe('高');
    expect(resolveSoftTemplateDefaultPriority('sunset_photography')).toBe('低');
  });

  it('sorts soft entries by priority rank descending', () => {
    const sorted = sortSoftEntriesByPriority(
      [
        { id: 'a', sliderValue: 25 },
        { id: 'b', sliderValue: 85 },
        { id: 'c', sliderValue: 50 },
      ],
      sliderToPriority,
    );
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('ranks 高 above 低', () => {
    expect(softPriorityRank('高')).toBeGreaterThan(softPriorityRank('低'));
  });
});
