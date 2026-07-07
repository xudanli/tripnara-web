import { describe, expect, it } from 'vitest';
import {
  deriveDecisionSpaceContentFromDetail,
  mapDetailActionsToDecisionOptions,
} from '@/lib/decision-space-detail-content.util';

describe('decision-space-detail-content', () => {
  it('maps detail.actions to options without GET .../options', () => {
    const derived = deriveDecisionSpaceContentFromDetail({
      id: 'dp_id:coverage-gap:1',
      type: 'INFEASIBILITY',
      title: '第6天 · 红沙滩',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      actions: [
        {
          actionId: 'option-1',
          label: '查开放时间',
          summary: '查询该景点/地点的开放时间',
          allowed: true,
        },
        {
          actionId: 'option-2',
          summary: '手动标记',
          allowed: true,
        },
      ],
    });

    expect(derived.optionsActions).toHaveLength(2);
    expect(derived.options.map((o) => o.id)).toEqual(['option-1', 'option-2']);
    expect(derived.options[0]?.description).toContain('开放时间');
  });

  it('prefers embedded options payload when present', () => {
    const derived = deriveDecisionSpaceContentFromDetail({
      id: 'p1',
      type: 'RISK',
      title: 't',
      status: 'OPEN',
      primaryEnforcement: 'BLOCK',
      options: [{ id: 'opt-a', label: 'A', title: 'Plan A' }],
      actions: [{ actionId: 'ignored', label: 'x', allowed: true }],
    });

    expect(derived.options.map((o) => o.id)).toEqual(['opt-a']);
  });

  it('mapDetailActionsToDecisionOptions reads optionId from payload', () => {
    const options = mapDetailActionsToDecisionOptions([
      {
        actionId: 'act-1',
        label: 'Apply',
        allowed: true,
        payload: { optionId: 'repair-42' },
      },
    ]);
    expect(options[0]?.id).toBe('repair-42');
  });
});
