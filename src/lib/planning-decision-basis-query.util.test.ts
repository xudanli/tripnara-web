import { describe, expect, it } from 'vitest';
import { resolvePlanningConflictIdForBasis } from '@/lib/planning-decision-basis-query.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

describe('resolvePlanningConflictIdForBasis', () => {
  it('prefers feasibility issue id over planning conflict id', () => {
    const conflict = {
      id: 'planning-conflict-1',
      issue: { id: 'cfl_transport_abc' },
    } as PlanningConflictItem;

    expect(resolvePlanningConflictIdForBasis(conflict)).toBe('cfl_transport_abc');
  });
});
