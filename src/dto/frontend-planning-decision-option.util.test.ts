import { describe, expect, it } from 'vitest';
import { normalizePlanningDecisionPackOption } from '@/api/normalize-planning-decision-pack';
import {
  getOptionBadge,
  getOptionDisplayTitle,
  getRecommendedOption,
  resolveOptionOutcomeItems,
} from '@/dto/frontend-planning-decision-option.util';
import type { PlanningDecisionPack } from '@/dto/frontend-planning-decision-pack.types';
import { decisionProposalViewFromPackOption } from '@/lib/decision-proposal-option-view.util';

describe('frontend-planning-decision-option.util', () => {
  it('getOptionDisplayTitle prefers headline', () => {
    const option = normalizePlanningDecisionPackOption({
      id: 'o1',
      headline: '提前 20 分钟离开蓝湖',
      title: 'fallback',
      optionKind: 'SHIFT_EARLIER',
      outcomes: [],
      costs: [],
    })!;

    expect(getOptionDisplayTitle(option)).toBe('提前 20 分钟离开蓝湖');
    expect(getOptionBadge(option, 0)).toBe('方案 A');
  });

  it('normalizes structured outcomeItems and syncs outcomes[]', () => {
    const option = normalizePlanningDecisionPackOption({
      id: 'o1',
      badge: '方案 A',
      letter: 'A',
      headline: '提前离开',
      optionKind: 'SHIFT_EARLIER',
      recommended: true,
      outcomeItems: [{ text: '午餐不受影响', tone: 'good' }],
      costItems: [{ text: '起床更早', tone: 'caution' }],
      dataBasis: [{ icon: 'traffic', label: '历史拥堵' }],
    })!;

    expect(option.outcomes).toEqual(['午餐不受影响']);
    expect(option.costs).toEqual(['起床更早']);
    expect(resolveOptionOutcomeItems(option)[0]?.tone).toBe('good');

    const view = decisionProposalViewFromPackOption(option, 0);
    expect(view.badge).toBe('方案 A');
    expect(view.dataBasis).toHaveLength(1);
    expect(view.dataBasis[0]?.iconKey).toBe('traffic');
  });

  it('getRecommendedOption reads from pack', () => {
    const pack: PlanningDecisionPack = {
      schema: 'tripnara.planning_decision_pack@v1',
      options: [
        { id: 'b', title: 'B', optionKind: 'SHIFT_LATER', outcomes: [], costs: [] },
        { id: 'a', title: 'A', recommended: true, optionKind: 'SHIFT_EARLIER', outcomes: [], costs: [] },
      ],
    };
    expect(getRecommendedOption(pack)?.id).toBe('a');
  });
});
