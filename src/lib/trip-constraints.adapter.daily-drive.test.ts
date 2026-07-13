import { describe, expect, it } from 'vitest';
import { partitionConstraintEntries } from '@/lib/constraint-console-partition.util';
import { tripConstraintToListEntry } from '@/lib/trip-constraints.adapter';
import { buildEditorDraftFromEntry } from '@/components/plan-studio/workbench/constraint-console-view.util';
import { TRIP_CONSTRAINT_LEGACY_IDS, type TripConstraint } from '@/types/trip-constraints';

const MAX_DAILY_DRIVE_API: TripConstraint = {
  id: TRIP_CONSTRAINT_LEGACY_IDS.MAX_DAILY_DRIVE,
  name: '每日驾驶上限',
  type: 'HARD',
  category: 'TRANSPORT',
  enabled: true,
  scope: { type: 'TRIP' },
  displayValue: '≤ 6 小时/天',
  source: { type: 'USER', templateId: 'max_daily_drive' },
  value: { maxHours: 6 },
  contractMeta: {
    enabledSummary: '已生效：每日驾驶上限',
    scopeLabel: '行程范围',
    judgmentRule: '单日累计驾驶时长上限',
    violationResult: 'BLOCK',
    violationResultLabel: '阻断路线',
  },
};

describe('tripConstraintToListEntry · max_daily_drive', () => {
  it('maps USER HARD c_max_daily_drive to editable hard list entry', () => {
    const entry = tripConstraintToListEntry(MAX_DAILY_DRIVE_API);

    expect(entry.id).toBe('daily_drive');
    expect(entry.kind).toBe('hard');
    expect(entry.readOnly).toBe(false);
    expect(entry.sectionKey).not.toBe('readonly_official');
  });

  it('partitions into userHardItems, not officialRuleItems', () => {
    const entry = tripConstraintToListEntry(MAX_DAILY_DRIVE_API);
    const partition = partitionConstraintEntries([entry]);

    expect(partition.userHardItems.map((item) => item.id)).toEqual(['daily_drive']);
    expect(partition.officialRuleItems).toHaveLength(0);
  });

  it('buildEditorDraftFromEntry hydrates daily_drive from API constraint', () => {
    const draft = buildEditorDraftFromEntry('daily_drive', null, { metadata: {} } as never, [], {
      apiConstraint: MAX_DAILY_DRIVE_API,
    });
    expect(draft.targetValue).toBe(6);
  });
});
