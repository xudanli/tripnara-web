import { describe, expect, it } from 'vitest';
import { Route } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  buildConstraintConsoleSections,
  mergeContractPatch,
} from './trip-constraints-contract.util';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';

describe('mergeContractPatch', () => {
  it('merges changeStrategy archetype and tolerances', () => {
    const next = mergeContractPatch(
      {
        changeStrategy: {
          archetype: 'BALANCED',
          tolerances: { maxDelayMinutes: 60, maxBudgetOverrunPct: 5 },
        },
      },
      {
        changeStrategy: {
          archetype: 'EXPLORATORY',
          tolerances: { maxBudgetOverrunPct: 10 },
        },
      },
    );

    expect(next.changeStrategy?.archetype).toBe('EXPLORATORY');
    expect(next.changeStrategy?.tolerances).toEqual({
      maxDelayMinutes: 60,
      maxBudgetOverrunPct: 10,
    });
  });
});

describe('buildConstraintConsoleSections', () => {
  it('keeps official rules out of conflicts_and_impact list', () => {
    const officialRule: ConstraintListEntry = {
      id: 'blue_lagoon_reservation',
      kind: 'external',
      label: '蓝湖需预约',
      icon: Route,
      sourceType: 'OFFICIAL_RULE',
      readOnly: true,
      locked: true,
      sectionKey: 'readonly_official',
      hasConflict: true,
      cardTone: 'danger',
    };
    const userHard: ConstraintListEntry = {
      id: 'max_daily_drive',
      kind: 'hard',
      label: '连续驾驶限制',
      icon: Route,
      locked: false,
      hasConflict: true,
      cardTone: 'danger',
    };

    const response: TripConstraintsListResponse = {
      meta: {
        tripId: 'trip-1',
        constraintsVersion: 1,
        total: 2,
        sections: [
          { key: 'conflicts_and_impact', label: '冲突与影响', contractBlock: 'conflicts', constraintIds: ['blue_lagoon_reservation', 'max_daily_drive'] },
          { key: 'readonly_official', label: '目的地规则', readonly: true, constraintIds: ['blue_lagoon_reservation'] },
        ],
      },
      items: [],
      contract: {},
    };

    const sections = buildConstraintConsoleSections({
      response,
      partition: {
        userHardItems: [userHard],
        userSoftItems: [],
        officialRuleItems: [officialRule],
        worldFeasibilityItem: null,
      },
      allEntries: [userHard, officialRule],
    });

    const conflicts = sections.find((section) => section.meta.key === 'conflicts_and_impact');
    const official = sections.find((section) => section.meta.key === 'readonly_official');

    expect(conflicts?.items.map((item) => item.id)).toEqual(['max_daily_drive']);
    expect(official?.items.map((item) => item.id)).toEqual(['blue_lagoon_reservation']);
  });
});
