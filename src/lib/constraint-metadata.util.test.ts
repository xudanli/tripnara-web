import { describe, expect, it } from 'vitest';
import { Car, Clock, ShieldAlert } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  buildHardConstraintMetadata,
  ensureHardConstraintMetadataOnEntries,
  resolveHardConstraintMetaKey,
} from './constraint-metadata.util';

function hardEntry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id' | 'label'>): ConstraintListEntry {
  return {
    kind: 'hard',
    icon: Clock,
    ...partial,
  };
}

describe('constraint-metadata.util', () => {
  it('builds metadata for daily drive with dynamic rule and enabled summary', () => {
    const meta = buildHardConstraintMetadata({
      entry: hardEntry({ id: 'daily_drive', label: '每日驾驶上限', value: '≤ 4 小时/天' }),
      draft: {
        id: 'daily_drive',
        name: '每日驾驶上限',
        enabled: true,
        type: 'HARD',
        scope: 'TRIP',
        targetValue: 3,
        targetUnit: 'hour',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 8,
        locked: false,
        reason: '',
      },
    });
    expect(meta.enabledLabel).toBe('已启用：每日驾驶上限');
    expect(meta.scopeLabel).toContain('整趟行程');
    expect(meta.ruleLabel).toContain('3 小时');
    expect(meta.violationLabel).toBe('阻断执行');
  });

  it('resolves c_no_night_drive to no night drive rule', () => {
    const entry = hardEntry({ id: 'c_no_night_drive', label: '不夜驾', icon: Car });
    expect(resolveHardConstraintMetaKey(entry, { id: 'c_no_night_drive', name: '不夜驾', type: 'HARD' })).toBe(
      'no_night_drive',
    );
    const meta = buildHardConstraintMetadata({
      entry,
      apiConstraint: { id: 'c_no_night_drive', name: '不夜驾', type: 'HARD', category: 'SAFETY' },
    });
    expect(meta.enabledLabel).toBe('已启用：不夜驾');
    expect(meta.ruleLabel).toBe('日落后 30 分钟不得继续驾驶');
    expect(meta.violationLabel).toBe('阻断执行');
  });

  it('uses API scope for day-scoped constraints', () => {
    const meta = buildHardConstraintMetadata({
      entry: hardEntry({ id: 'custom', label: '自定义', icon: Car }),
      apiConstraint: {
        id: 'c_custom',
        name: '自定义',
        type: 'HARD',
        scope: { type: 'DAY', dayIndex: 2 },
      },
    });
    expect(meta.scopeLabel).toContain('第 2 天');
  });

  it('prefers structured rule from API value object', () => {
    const meta = buildHardConstraintMetadata({
      entry: hardEntry({ id: 'c_custom_rule', label: '自定义规则' }),
      apiConstraint: {
        id: 'c_custom_rule',
        name: '自定义规则',
        type: 'HARD',
        value: {
          judgmentRule: '日落后 30 分钟不得继续驾驶',
          violationResult: '阻断执行',
        },
      },
    });
    expect(meta.ruleLabel).toBe('日落后 30 分钟不得继续驾驶');
    expect(meta.violationLabel).toBe('阻断执行');
  });

  it('prefers contractMeta over static rules and value object', () => {
    const meta = buildHardConstraintMetadata({
      entry: hardEntry({ id: 'c_no_night_drive', label: '不夜驾', icon: Car }),
      apiConstraint: {
        id: 'c_no_night_drive',
        name: '不夜驾',
        type: 'HARD',
        category: 'SAFETY',
        value: {
          judgmentRule: '日落后 30 分钟不得继续驾驶',
          violationResult: '阻断执行',
        },
        contractMeta: {
          enabledSummary: '已启用：不夜驾',
          scopeLabel: '整趟行程',
          judgmentRule: '日落后 45 分钟不得继续驾驶',
          violationResult: 'BLOCK',
          violationResultLabel: '阻断执行',
        },
      },
    });
    expect(meta.enabledLabel).toBe('已启用：不夜驾');
    expect(meta.scopeLabel).toContain('整趟行程');
    expect(meta.ruleLabel).toBe('日落后 45 分钟不得继续驾驶');
    expect(meta.violationLabel).toBe('阻断执行');
  });

  it('renders structured scope rows from scopeBinding', () => {
    const meta = buildHardConstraintMetadata({
      entry: hardEntry({ id: 'daily_drive', label: '每日驾驶上限' }),
      draft: {
        id: 'daily_drive',
        name: '每日驾驶上限',
        enabled: true,
        type: 'HARD',
        scope: 'DAY',
        targetValue: 4,
        targetUnit: 'hour',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 8,
        locked: false,
        reason: '',
        scopeBinding: {
          temporal: { kind: 'day_range', dayFrom: 2, dayTo: 5 },
          member: { kind: 'primary_driver', label: '主驾驶人' },
          phase: { planning: true, execution: true },
          activity: { kind: 'activity_type', label: '驾驶' },
        },
      },
    });
    expect(meta.scopeLabel).toContain('第 2—5 天');
    expect(meta.scopeRows.some((r) => r.label === '成员' && r.value.includes('主驾驶人'))).toBe(true);
    expect(meta.scopeRows.some((r) => r.label === '阶段' && r.value.includes('规划'))).toBe(true);
  });

  it('appends catalog hard notes to judgment rule label', () => {
    const meta = buildHardConstraintMetadata({
      entry: {
        id: 'no_high_risk_activity',
        kind: 'hard',
        label: '不参加高风险活动',
        icon: ShieldAlert,
        value: '已启用',
      },
      apiConstraint: {
        id: 'c_tpl_no_high_risk_activity',
        name: '不参加高风险活动',
        type: 'HARD',
        category: 'SAFETY',
        enabled: true,
        value: { enabled: true, notes: '冰川徒步' },
        contractMeta: {
          judgmentRule: '不得安排冰川徒步等高风险活动',
          violationResult: 'BLOCK',
        },
      } as import('@/types/trip-constraints').TripConstraint,
      draft: {
        id: 'no_high_risk_activity',
        label: '不参加高风险活动',
        type: 'HARD',
        scope: 'TRIP',
        enabled: true,
        reason: '冰川徒步',
        targetValue: 1,
        priority: 7,
        locked: false,
      },
    });
    expect(meta.ruleLabel).toContain('冰川徒步');
  });

  it('ensureHardConstraintMetadataOnEntries fills missing metadata on hard items', () => {
    const entries = ensureHardConstraintMetadataOnEntries([
      {
        id: 'daily_drive',
        kind: 'hard',
        label: '每日驾驶上限',
        icon: Car,
        value: '≤ 4 小时/天',
      },
    ]);
    expect(entries[0]?.metadata?.enabledLabel).toContain('每日驾驶上限');
    expect(entries[0]?.metadata?.ruleLabel).toContain('驾驶');
    expect(entries[0]?.metadata?.violationLabel).toBe('阻断执行');
  });
});
