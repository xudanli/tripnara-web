import { describe, expect, it } from 'vitest';
import {
  formatDecisionBasisUpdatedAge,
  resolveDecisionBasisFieldIcon,
} from '@/dto/frontend-planning-decision-basis.types';

describe('frontend-planning-decision-basis.types', () => {
  it('resolves field icons', () => {
    expect(resolveDecisionBasisFieldIcon('travel_time')).toBeTruthy();
    expect(resolveDecisionBasisFieldIcon('travel_time')).toBe(
      resolveDecisionBasisFieldIcon('unknown'),
    );
  });

  it('formats updated age', () => {
    const now = Date.parse('2026-07-06T12:50:00.000Z');
    expect(formatDecisionBasisUpdatedAge('2026-07-06T12:43:00.000Z', now)).toBe('更新于 7 分钟前');
  });
});
