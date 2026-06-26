import { describe, expect, it } from 'vitest';
import {
  mergeAuthoritativeRepairOptions,
  parseInvalidRepairOptionFromError,
} from '@/lib/feasibility-repair-options';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';

function option(id: string, actionType?: FeasibilityRepairOptionDto['actionType']): FeasibilityRepairOptionDto {
  return { id, label: id, actionType };
}

describe('mergeAuthoritativeRepairOptions', () => {
  it('uses api options only when api returned items', () => {
    const merged = mergeAuthoritativeRepairOptions(
      [option('adjust-a', 'adjust_time')],
      [option('move_to_day', 'move_to_day')],
    );
    expect(merged.map((o) => o.id)).toEqual(['adjust-a']);
  });

  it('falls back to seed when api empty', () => {
    const merged = mergeAuthoritativeRepairOptions([], [option('adjust-a', 'adjust_time')]);
    expect(merged.map((o) => o.id)).toEqual(['adjust-a']);
  });
});

describe('parseInvalidRepairOptionFromError', () => {
  it('parses backend blocker mismatch message', () => {
    expect(
      parseInvalidRepairOptionFromError(
        '选项 move_to_day 不属于阻塞项 issue-inter-day-travel-abc 的修复列表',
      ),
    ).toBe('move_to_day');
  });
});
