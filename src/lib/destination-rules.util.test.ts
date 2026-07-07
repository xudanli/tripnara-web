import { describe, expect, it } from 'vitest';
import { Route } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  buildDestinationRuleMetadata,
  enrichListEntryWithDestinationRule,
  groupDestinationRules,
} from './destination-rules.util';

function ruleEntry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id' | 'label'>): ConstraintListEntry {
  return {
    kind: 'external',
    icon: Route,
    sourceType: 'OFFICIAL_RULE',
    readOnly: true,
    locked: true,
    ...partial,
  };
}

describe('destination-rules.util', () => {
  it('builds Iceland F-road style metadata from contractMeta + value', () => {
    const meta = buildDestinationRuleMetadata({
      entry: ruleEntry({ id: 'c_official_is_froad_2wd', label: 'F 路车辆准入' }),
      apiConstraint: {
        id: 'c_official_is_froad_2wd',
        name: 'F 路车辆准入',
        type: 'EXTERNAL',
        sectionKey: 'readonly_official',
        locked: true,
        source: { type: 'OFFICIAL_RULE', templateId: 'f_road_vehicle_access' },
        verificationStatus: 'CURRENT',
        value: {
          destinationRuleCategory: 'TRAFFIC',
          destinationRuleTier: 'BLOCK',
          sourceAgency: '冰岛道路管理部门',
          applicableScope: '高地道路（F 路）',
          judgmentRule: '仅允许符合要求的四驱车辆进入 F 路',
          violationResult: '阻断路线',
        },
        contractMeta: {
          enabledSummary: '已生效：F 路车辆准入',
          scopeLabel: '高地道路（F 路）',
          judgmentRule: '仅允许符合要求的四驱车辆进入 F 路',
          violationResult: 'BLOCK',
          violationResultLabel: '阻断路线',
        },
      },
    });
    expect(meta.categoryLabel).toBe('交通规则');
    expect(meta.tier).toBe('BLOCK');
    expect(meta.judgmentRule).toContain('四驱');
    expect(meta.violationLabel).toBe('阻断路线');
    expect(meta.blocksExecution).toBe(true);
  });

  it('prefers structured fields from API value', () => {
    const meta = buildDestinationRuleMetadata({
      entry: ruleEntry({ id: 'c_wind', label: '强风预警' }),
      apiConstraint: {
        id: 'c_wind',
        name: '强风预警',
        type: 'EXTERNAL',
        source: { type: 'OFFICIAL_RULE' },
        value: {
          destinationRuleCategory: 'NATURAL_RISK',
          destinationRuleTier: 'CONDITIONAL',
          sourceAgency: '冰岛气象局',
          applicableScope: '南岸沿线',
          judgmentRule: '红色预警下禁止户外驾驶',
          violationResult: '阻断路线',
        },
      },
    });
    expect(meta.categoryLabel).toBe('自然风险');
    expect(meta.tier).toBe('CONDITIONAL');
    expect(meta.sourceLabel).toBe('冰岛气象局');
  });

  it('enriches official rule with readonly_official sectionKey', () => {
    const enriched = enrichListEntryWithDestinationRule(
      ruleEntry({ id: 'c_official_is_froad_2wd', label: 'F路', sectionKey: 'hard_must_satisfy' }),
    );
    expect(enriched.sectionKey).toBe('readonly_official');
    expect(enriched.readOnly).toBe(true);
  });

  it('groups rules by five categories', () => {
    const items = [
      enrichListEntryWithDestinationRule(ruleEntry({ id: 'f_road_4wd', label: 'F路' })),
      enrichListEntryWithDestinationRule(
        ruleEntry({
          id: 'c_wind',
          label: '强风',
          destinationRule: {
            category: 'NATURAL_RISK',
            categoryLabel: '自然风险',
            tier: 'ADVISORY',
            tierLabel: '建议性',
            sourceLabel: '气象局',
            scopeLabel: '全岛',
            judgmentRule: '建议避开强风时段',
            violationLabel: '影响风险评分',
            evidenceStatus: 'VERIFIED',
            evidenceStatusLabel: '已验证',
            blocksExecution: false,
            canSetMoreConservative: true,
            editable: false,
          },
        }),
      ),
    ];
    const groups = groupDestinationRules(items);
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });
});
