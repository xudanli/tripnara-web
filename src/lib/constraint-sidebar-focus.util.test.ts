import { describe, expect, it } from 'vitest';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { Car, Clock } from 'lucide-react';
import {
  collectActiveExternalConditions,
  collectWorkbenchMustComplyItems,
  countWorkbenchPlanningConditions,
  isConstraintSectionCollapsedByDefault,
  isTripObjectiveConstraintEntry,
  isWorkbenchSummarySection,
  partitionHardItemsForWorkbench,
  resolveConstraintSidebarFocusMode,
  resolveWorkbenchSectionTitle,
  WORKBENCH_EXTERNAL_SECTION_KEY,
} from '@/lib/constraint-sidebar-focus.util';

function entry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id'>): ConstraintListEntry {
  return {
    kind: 'hard',
    label: partial.id,
    icon: Clock,
    ...partial,
  };
}

describe('resolveConstraintSidebarFocusMode', () => {
  it('returns full when no focus signals', () => {
    expect(resolveConstraintSidebarFocusMode({})).toBe('full');
  });

  it('returns attention when decision space is open', () => {
    expect(resolveConstraintSidebarFocusMode({ decisionSpaceOpen: true })).toBe('attention');
  });

  it('returns attention when from travel overview', () => {
    expect(resolveConstraintSidebarFocusMode({ fromTravel: true })).toBe('attention');
  });

  it('returns attention when problem or conflict id is present', () => {
    expect(resolveConstraintSidebarFocusMode({ problemId: 'prob_1' })).toBe('attention');
    expect(resolveConstraintSidebarFocusMode({ conflictId: 'conf_1' })).toBe('attention');
  });

  it('returns attention when user forces focus via conflict badge', () => {
    expect(resolveConstraintSidebarFocusMode({ forceAttention: true })).toBe('attention');
  });
});

describe('isWorkbenchSummarySection', () => {
  it('shows the four planning condition groups in workbench summary', () => {
    expect(isWorkbenchSummarySection('travel_objectives')).toBe(true);
    expect(isWorkbenchSummarySection('hard_must_satisfy')).toBe(true);
    expect(isWorkbenchSummarySection('soft_prefer')).toBe(true);
  });

  it('hides secondary and external sections from workbench summary', () => {
    expect(isWorkbenchSummarySection('team_members')).toBe(false);
    expect(isWorkbenchSummarySection('automation')).toBe(false);
    expect(isWorkbenchSummarySection('readonly_official')).toBe(false);
    expect(isWorkbenchSummarySection('readonly_world')).toBe(false);
    expect(isWorkbenchSummarySection('conflicts_and_impact')).toBe(false);
    expect(
      isWorkbenchSummarySection('conflicts_and_impact', { conflictCount: 2 }),
    ).toBe(false);
  });
});

describe('partitionHardItemsForWorkbench', () => {
  it('routes trip basics to group 1 and enforcement to group 2', () => {
    const items = [
      entry({ id: 'time_range', label: '总行程时长', value: '10 天' }),
      entry({ id: 'daily_drive', label: '每日驾驶上限', value: '≤ 4 小时/天' }),
      entry({ id: 'must_go', label: '必去地点', icon: Car }),
    ];
    const { tripObjectiveItems, mustComplyItems } = partitionHardItemsForWorkbench(items);
    expect(tripObjectiveItems.map((item) => item.id)).toEqual(['must_go']);
    expect(mustComplyItems.map((item) => item.id)).toEqual(['time_range', 'daily_drive']);
  });
});

describe('collectWorkbenchMustComplyItems', () => {
  it('promotes max_segment_distance from readonly_official into must comply', () => {
    const sections = [
      {
        meta: { key: 'hard_must_satisfy', label: '必须满足' },
        items: [
          entry({ id: 'time_range', label: '总行程时长', value: '10 天' }),
          entry({ id: 'daily_drive', label: '每日驾驶上限', value: '≤ 6 小时/天' }),
          entry({ id: 'no_night_drive', label: '不夜驾' }),
        ],
      },
      {
        meta: { key: 'readonly_official', label: '目的地规则' },
        items: [
          entry({
            id: 'c_max_segment_distance',
            kind: 'external',
            readOnly: true,
            label: '连续驾驶上限',
            value: '≤ 200 km',
          }),
        ],
      },
    ] as import('@/lib/trip-constraints-contract.util').ConstraintConsoleSectionViewModel[];

    const { mustComplyItems } = collectWorkbenchMustComplyItems(sections);
    expect(mustComplyItems.map((item) => item.id)).toEqual([
      'time_range',
      'daily_drive',
      'no_night_drive',
      'c_max_segment_distance',
    ]);
  });
});

describe('collectActiveExternalConditions', () => {
  it('prefers active external entries and caps at five', () => {
    const sections = [
      {
        meta: { key: 'readonly_world', label: '实时世界状态' },
        items: [
          entry({
            id: 'world_wind',
            kind: 'external',
            label: 'Day 4 下午风速偏高',
            statusLabel: '影响中',
            statusTone: 'warning',
          }),
          entry({ id: 'world_daylight', kind: 'external', label: '冬季日照较短' }),
        ],
      },
      {
        meta: { key: 'readonly_official', label: '目的地规则' },
        items: [
          entry({
            id: 'rule_froad',
            kind: 'external',
            readOnly: true,
            label: '两驱车不能进入 F 路',
            statusLabel: '生效中',
          }),
        ],
      },
    ] as import('@/lib/trip-constraints-contract.util').ConstraintConsoleSectionViewModel[];

    const active = collectActiveExternalConditions(sections);
    expect(active.map((item) => item.id)).toEqual(['world_wind', 'rule_froad']);
  });
});

describe('countWorkbenchPlanningConditions', () => {
  it('counts all visible planning inputs', () => {
    expect(
      countWorkbenchPlanningConditions({
        tripObjectiveItems: [entry({ id: 'must_go' })],
        mustComplyItems: [entry({ id: 'time_range' }), entry({ id: 'daily_drive' })],
        softPrefCount: 2,
        hasTravelGoals: true,
        externalCount: 1,
      }),
    ).toBe(7);
  });
});

describe('resolveWorkbenchSectionTitle', () => {
  it('renames workbench section titles without affecting full console', () => {
    expect(resolveWorkbenchSectionTitle('hard_must_satisfy', '必须满足', 'workbench')).toBe(
      '必须遵守',
    );
    expect(resolveWorkbenchSectionTitle('hard_must_satisfy', '必须满足', 'full')).toBe('必须满足');
    expect(resolveWorkbenchSectionTitle(WORKBENCH_EXTERNAL_SECTION_KEY, '外部', 'workbench')).toBe(
      '当前影响规划',
    );
  });
});

describe('isTripObjectiveConstraintEntry', () => {
  it('normalizes api ids for trip objective classification', () => {
    expect(isTripObjectiveConstraintEntry({ id: 'c_travelers' })).toBe(true);
    expect(isTripObjectiveConstraintEntry({ id: 'time_range' })).toBe(false);
    expect(isTripObjectiveConstraintEntry({ id: 'budget' })).toBe(false);
  });
});

describe('isConstraintSectionCollapsedByDefault', () => {
  it('keeps core planning sections expanded in full mode', () => {
    expect(isConstraintSectionCollapsedByDefault('travel_objectives', 'full')).toBe(false);
    expect(isConstraintSectionCollapsedByDefault('hard_must_satisfy', 'full')).toBe(false);
    expect(isConstraintSectionCollapsedByDefault('soft_prefer', 'full')).toBe(false);
  });

  it('collapses secondary sections in full mode', () => {
    expect(isConstraintSectionCollapsedByDefault('team_members', 'full')).toBe(true);
    expect(isConstraintSectionCollapsedByDefault('change_strategy', 'full')).toBe(true);
    expect(isConstraintSectionCollapsedByDefault('readonly_official', 'full')).toBe(true);
  });

  it('collapses non-essential sections in attention mode', () => {
    expect(isConstraintSectionCollapsedByDefault('travel_objectives', 'attention')).toBe(true);
    expect(isConstraintSectionCollapsedByDefault('soft_prefer', 'attention')).toBe(true);
    expect(isConstraintSectionCollapsedByDefault('team_members', 'attention')).toBe(true);
  });

  it('keeps hard section expanded in attention mode', () => {
    expect(isConstraintSectionCollapsedByDefault('hard_must_satisfy', 'attention')).toBe(false);
    expect(isConstraintSectionCollapsedByDefault('conflicts_and_impact', 'attention')).toBe(false);
  });

  it('expands trip goals and collapses external context in workbench summary', () => {
    expect(isConstraintSectionCollapsedByDefault('travel_objectives', 'full', 'workbench')).toBe(
      false,
    );
    expect(isConstraintSectionCollapsedByDefault('planning_context', 'full', 'workbench')).toBe(
      true,
    );
    expect(
      isConstraintSectionCollapsedByDefault(WORKBENCH_EXTERNAL_SECTION_KEY, 'full', 'workbench'),
    ).toBe(true);
    expect(isConstraintSectionCollapsedByDefault('travel_objectives', 'full', 'full')).toBe(false);
  });

  it('collapses planning context in attention mode', () => {
    expect(isConstraintSectionCollapsedByDefault('planning_context', 'attention', 'workbench')).toBe(
      true,
    );
  });
});
