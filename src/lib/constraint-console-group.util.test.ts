import { describe, expect, it } from 'vitest';
import { Car, Clock, Wallet } from 'lucide-react';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { groupHardConstraints } from './constraint-console-group.util';

function entry(partial: Partial<ConstraintListEntry> & Pick<ConstraintListEntry, 'id' | 'label'>): ConstraintListEntry {
  return {
    kind: 'hard',
    icon: Clock,
    ...partial,
  };
}

describe('constraint-console-group.util', () => {
  it('groups hard constraints by category', () => {
    const groups = groupHardConstraints([
      entry({ id: 'budget', label: '预算', icon: Wallet }),
      entry({ id: 'daily_drive', label: '驾驶', icon: Car }),
      entry({ id: 'time_range', label: '时长', icon: Clock }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['TIME', 'BUDGET', 'TRANSPORT']);
    expect(groups.find((g) => g.key === 'BUDGET')?.items).toHaveLength(1);
  });
});
