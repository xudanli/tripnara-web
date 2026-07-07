import { describe, expect, it } from 'vitest';
import { Car, Route } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  attachCheckIssuesToEntries,
  canPatchConstraint,
  canShowConstraintEdit,
  isOfficialRuleConstraint,
  isOfficialReadonlyConstraint,
  isWorldFeasibilityConstraint,
  buildConstraintHelpTooltip,
  partitionConstraintEntries,
  sortOfficialRuleItems,
} from './constraint-console-partition.util';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';

function entry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id' | 'kind' | 'label' | 'icon'>): ConstraintListEntry {
  return {
    locked: false,
    ...partial,
  };
}

describe('constraint-console-partition.util', () => {
  it('partitions user constraints, official rules, and world feasibility', () => {
    const items: ConstraintListEntry[] = [
      entry({ id: 'budget', kind: 'hard', label: '预算', icon: Car }),
      entry({ id: 'custom_soft', kind: 'soft', label: '软偏好', icon: Car }),
      entry({
        id: 'f_road_4wd',
        kind: 'external',
        label: 'F 路须四驱',
        icon: Route,
        sourceType: 'OFFICIAL_RULE',
        readOnly: true,
      }),
      entry({
        id: TRIP_CONSTRAINT_LEGACY_IDS.WORLD_FEASIBILITY,
        kind: 'external',
        label: '实时验证',
        icon: Route,
      }),
    ];

    const partition = partitionConstraintEntries(items);
    expect(partition.userHardItems).toHaveLength(1);
    expect(partition.userSoftItems).toHaveLength(1);
    expect(partition.officialRuleItems).toHaveLength(1);
    expect(partition.worldFeasibilityItem?.id).toBe(TRIP_CONSTRAINT_LEGACY_IDS.WORLD_FEASIBILITY);
  });

  it('detects official rules by source type, not HARD type', () => {
    expect(
      isOfficialRuleConstraint({
        type: 'EXTERNAL',
        source: { type: 'OFFICIAL_RULE' },
      }),
    ).toBe(true);
    expect(
      isOfficialRuleConstraint({
        type: 'HARD',
        source: { type: 'USER' },
      }),
    ).toBe(false);
  });

  it('sorts SAFETY category official rules first', () => {
    const sorted = sortOfficialRuleItems([
      entry({
        id: 'b',
        kind: 'external',
        label: 'B 规则',
        icon: Route,
        sourceType: 'OFFICIAL_RULE',
      }),
      entry({
        id: 'a',
        kind: 'external',
        label: 'A 安全',
        icon: Route,
        sourceType: 'OFFICIAL_RULE',
        category: 'SAFETY',
      }),
    ]);
    expect(sorted[0]?.id).toBe('a');
  });

  it('blocks patch for locked and official rules', () => {
    expect(canShowConstraintEdit(entry({ id: 'x', kind: 'hard', label: 'x', icon: Car, locked: true }))).toBe(false);
    expect(
      canShowConstraintEdit(
        entry({
          id: 'rule',
          kind: 'external',
          label: 'rule',
          icon: Route,
          readOnly: true,
          sourceType: 'OFFICIAL_RULE',
        }),
      ),
    ).toBe(false);
    expect(canShowConstraintEdit(entry({ id: 'y', kind: 'soft', label: 'y', icon: Car, sliderValue: 50 }))).toBe(false);
    expect(canShowConstraintEdit(entry({ id: 'earliest_departure', kind: 'hard', label: 't', icon: Car }))).toBe(true);
  });

  it('attaches check issue ids using api constraint id', () => {
    const items = [
      entry({ id: 'travelers', kind: 'hard', label: '人数', icon: Car }),
    ];
    const next = attachCheckIssuesToEntries(items, [
      { id: 'issue-1', constraintId: TRIP_CONSTRAINT_LEGACY_IDS.TRAVELERS },
    ]);
    expect(next[0]?.checkIssueId).toBe('issue-1');
  });

  it('prefers decisionProblemId for conflict click', () => {
    const items = [
      entry({ id: 'travelers', kind: 'hard', label: '人数', icon: Car }),
    ];
    const next = attachCheckIssuesToEntries(items, [
      {
        id: 'issue-1',
        decisionProblemId: 'dp-99',
        constraintId: TRIP_CONSTRAINT_LEGACY_IDS.TRAVELERS,
        allowRelaxation: false,
      },
    ]);
    expect(next[0]?.checkIssueId).toBe('dp-99');
    expect(next[0]?.allowRelaxation).toBe(false);
  });

  it('attaches check issues via relatedConstraintIds for c_official_*', () => {
    const items = [
      entry({
        id: 'c_official_is_froad_2wd',
        kind: 'external',
        label: 'F 路',
        icon: Route,
        sourceType: 'OFFICIAL_RULE',
        readOnly: true,
      }),
    ];
    const next = attachCheckIssuesToEntries(items, [
      {
        id: 'issue-froad',
        relatedConstraintIds: ['c_official_is_froad_2wd'],
        allowRelaxation: false,
      },
    ]);
    expect(next[0]?.checkIssueId).toBe('issue-froad');
    expect(next[0]?.allowRelaxation).toBe(false);
  });

  it('marks sacrificed soft constraints without duplicate schedule violation', () => {
    const items = [
      entry({
        id: 'lunch_time_window',
        kind: 'soft',
        label: '午餐窗口',
        icon: Car,
        sliderValue: 25,
      }),
    ];
    const next = attachCheckIssuesToEntries(
      items,
      [
        {
          id: 'sched-lunch',
          constraintId: 'c_tpl_lunch_time_window',
          severity: 'suggest_adjust',
          message: '午餐未落在窗口内',
        },
        {
          id: 'tradeoff-lunch',
          issueKind: 'soft_tradeoff',
          sacrificed: true,
          constraintId: 'c_tpl_lunch_time_window',
          message: '为保留更高优先级项，午餐窗口已放宽',
        },
      ],
      { sacrificedConstraintIds: ['c_tpl_lunch_time_window'] },
    );
    expect(next[0]?.softSacrificed).toBe(true);
    expect(next[0]?.statusLabel).toBe('已取舍');
    expect(next[0]?.checkIssueId).toBe('tradeoff-lunch');
    expect(next[0]?.hasConflict).toBe(false);
  });

  it('builds help tooltip from description and official readonly hint', () => {
    expect(
      buildConstraintHelpTooltip({
        description: '11–4 月 F 路通常关闭',
        sourceType: 'OFFICIAL_RULE',
        locked: true,
      }),
    ).toContain('11–4 月 F 路通常关闭');
    expect(
      buildConstraintHelpTooltip({
        description: '11–4 月 F 路通常关闭',
        sourceType: 'OFFICIAL_RULE',
        locked: true,
      }),
    ).toContain('不可手动修改');
    expect(
      buildConstraintHelpTooltip({
        description: '相邻景点间单次驾驶直线距离上限',
        sourceType: 'USER',
        locked: true,
      }),
    ).toBe('相邻景点间单次驾驶直线距离上限');
    expect(
      buildConstraintHelpTooltip({
        sourceType: 'OFFICIAL_RULE',
        locked: true,
      }),
    ).toBeTruthy();
  });
});
