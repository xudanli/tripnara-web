import { describe, expect, it } from 'vitest';
import {
  countPlanObjectChainObjects,
  isPlanObjectDecisionProblem,
  isPlanObjectFeasibilityIssue,
  isPlanObjectPlanningConflict,
  isPlanObjectSemanticKey,
  normalizePlanObjectDto,
  normalizePlanObjectsDays,
  parsePlanObjectsResponsePayload,
  proofsHavePlanObjectEvidence,
  sortPlanObjectChain,
} from '@/lib/plan-object-source.util';
import type { PlanObjectDto } from '@/types/plan-objects';

describe('plan-object-source.util', () => {
  it('detects plan_object_ semantic keys', () => {
    expect(isPlanObjectSemanticKey('plan_object_meal_gap')).toBe(true);
    expect(isPlanObjectSemanticKey('constraint:daily_drive')).toBe(false);
  });

  it('detects plan-object-evaluator proofs', () => {
    expect(
      proofsHavePlanObjectEvidence([
        { evidenceSource: 'feasibility-engine' },
        { evidenceSource: 'plan-object-evaluator' },
      ]),
    ).toBe(true);
    expect(proofsHavePlanObjectEvidence([{ evidenceSource: 'osrm' }])).toBe(false);
  });

  it('flags feasibility issues and conflicts from plan object projection', () => {
    expect(
      isPlanObjectFeasibilityIssue({
        id: 'plan_object_visit_overlap',
        priority: 'must_handle',
        category: 'schedule',
        title: 'x',
        message: 'y',
        severity: 'high',
      }),
    ).toBe(true);

    expect(
      isPlanObjectPlanningConflict({
        id: 'c1',
        semanticKey: 'plan_object_transfer_buffer',
        priority: 'must_handle',
        categoryLabel: 'schedule',
        title: 't',
        message: 'm',
        source: 'feasibility',
      }),
    ).toBe(true);

    expect(
      isPlanObjectDecisionProblem({
        id: 'problem_1',
        semanticKey: 'plan_object_meal_window',
        type: 'INFEASIBILITY',
        title: 't',
        status: 'OPEN',
        primaryEnforcement: 'BLOCK',
      }),
    ).toBe(true);
  });

  it('maps BFF type field to kind and name to label', () => {
    expect(
      normalizePlanObjectDto({
        id: 'po_1',
        type: 'VISIT',
        name: 'Seljalandsfoss',
      }),
    ).toEqual({
      id: 'po_1',
      kind: 'VISIT',
      label: 'Seljalandsfoss',
      startAt: undefined,
      endAt: undefined,
      placeId: undefined,
      itemId: undefined,
      metadata: undefined,
    });
  });

  it('normalizes day chains with type-based objects', () => {
    const days = normalizePlanObjectsDays([
      {
        day_number: 1,
        objects: [
          { id: 'a', type: 'STAY', name: 'Hotel' },
          { id: 'b', type: 'TRANSFER' },
          { id: 'c', type: 'VISIT', label: 'POI' },
        ],
      },
    ]);
    expect(days[0]?.objects.map((o) => o.kind)).toEqual(['STAY', 'TRANSFER', 'VISIT']);
  });

  it('sorts chain STAY → TRANSFER → VISIT → MEAL_WINDOW', () => {
    const input: PlanObjectDto[] = [
      { id: '4', kind: 'MEAL_WINDOW', label: '午餐' },
      { id: '1', kind: 'STAY', label: '酒店' },
      { id: '3', kind: 'VISIT', label: '瀑布' },
      { id: '2', kind: 'TRANSFER', label: '驾车' },
    ];
    expect(sortPlanObjectChain(input).map((item) => item.kind)).toEqual([
      'STAY',
      'TRANSFER',
      'VISIT',
      'MEAL_WINDOW',
    ]);
  });

  it('maps MEAL alias to MEAL_WINDOW and synthesizes id when missing', () => {
    expect(
      normalizePlanObjectDto({ type: 'MEAL', name: 'Lunch' }, 'fallback_1'),
    ).toMatchObject({
      id: 'fallback_1',
      kind: 'MEAL_WINDOW',
      label: 'Lunch',
    });
  });

  it('reads chain from items alias on day payload', () => {
    const parsed = parsePlanObjectsResponsePayload({
      tripId: 'trip_1',
      days: [
        {
          dayNumber: 3,
          items: [{ id: 'v1', type: 'VISIT', name: 'Diamond Beach' }],
        },
      ],
    });
    expect(parsed.days[0]?.objects).toHaveLength(1);
    expect(parsed.days[0]?.objects[0]?.kind).toBe('VISIT');
  });

  it('groups top-level objects by day when day shells are empty', () => {
    const parsed = parsePlanObjectsResponsePayload({
      tripId: 'trip_1',
      days: [{ dayNumber: 1, objects: [] }],
      objects: [
        { id: 's1', type: 'STAY', day_number: 1, name: 'Hotel' },
        { id: 'v1', type: 'VISIT', day_number: 1, name: 'POI' },
      ],
    });
    expect(countPlanObjectChainObjects(parsed.days)).toBe(2);
    expect(parsed.days[0]?.objects.map((o) => o.kind)).toEqual(['STAY', 'VISIT']);
  });
});
