import { describe, expect, it } from 'vitest';
import {
  assertDecisionSurfaceCountsAligned,
  assertEntityInBothSurfaces,
} from './decision-surface-count-alignment.util';

describe('decision-surface-count-alignment.util', () => {
  it('passes when counts match', () => {
    const result = assertDecisionSurfaceCountsAligned({
      problemsOpenCount: 3,
      conflictsTotal: 3,
      overviewOpenCount: 3,
    });
    expect(result.aligned).toBe(true);
  });

  it('reports delta when misaligned', () => {
    const result = assertDecisionSurfaceCountsAligned({
      problemsOpenCount: 3,
      conflictsTotal: 5,
      overviewOpenCount: 3,
    });
    expect(result.aligned).toBe(false);
    expect(result.message).toContain('conflicts(5)');
  });

  it('reports timeline vs conflicts delta', () => {
    const result = assertDecisionSurfaceCountsAligned({
      conflictsTotal: 3,
      timelineConflictCount: 5,
    });
    expect(result.aligned).toBe(false);
    expect(result.deltas.timelineVsConflicts).toBe(2);
    expect(result.message).toContain('timeline(5)');
  });

  it('flags non-ssot timeline conflict source', () => {
    const result = assertDecisionSurfaceCountsAligned({
      conflictsTotal: 3,
      timelineConflictCount: 3,
      timelineConflictCountSource: 'schedule_conflicts',
    });
    expect(result.ssotSourceAligned).toBe(false);
    expect(result.aligned).toBe(false);
    expect(result.message).toContain('ssot_planning_conflicts');
  });

  it('checks F208 in both surfaces', () => {
    expect(
      assertEntityInBothSurfaces(
        'F208',
        [{ title: 'F208 封闭' }],
        [{ message: 'F208 封闭' }],
      ),
    ).toBe(true);
    expect(
      assertEntityInBothSurfaces('F208', [{ title: 'F208 封闭' }], []),
    ).toBe(false);
  });
});
