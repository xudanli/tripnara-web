import { describe, expect, it } from 'vitest';
import {
  decisionProposalViewFromPackOption,
  matchPackOptionIdForAction,
  resolvePackOptionActionId,
} from '@/lib/decision-proposal-option-view.util';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';

describe('decisionProposalViewFromPackOption', () => {
  it('maps pack option to proposal card view', () => {
    const option: PlanningDecisionPackOption = {
      id: 'opt-1',
      optionKind: 'SHIFT_EARLIER',
      title: '提前离开',
      headline: '提前离开',
      recommended: true,
      outcomes: ['午餐不受影响'],
      costs: ['停留缩短'],
      impactScope: { scope: 'DAY', itemIds: ['a', 'b', 'c'] },
    };

    const view = decisionProposalViewFromPackOption(option, 0);
    expect(view.letter).toBe('A');
    expect(view.tone).toBe('recommended');
    expect(view.title).toBe('提前离开');
    expect(view.outcomeItems).toHaveLength(1);
  });
});

describe('pack option action mapping', () => {
  const packOptions: PlanningDecisionPackOption[] = [
    {
      id: 'proposal_primary',
      optionKind: 'SHIFT_EARLIER',
      title: 'A',
      outcomes: [],
      costs: [],
      action: { actionId: 'act_shift' },
    },
  ];

  it('resolves action id for preview/submit', () => {
    expect(resolvePackOptionActionId(packOptions[0]!)).toBe('act_shift');
  });

  it('maps selected action back to pack option id for card highlight', () => {
    expect(matchPackOptionIdForAction(packOptions, 'act_shift')).toBe('proposal_primary');
    expect(matchPackOptionIdForAction(packOptions, 'proposal_primary')).toBe('proposal_primary');
  });
});
