import { describe, expect, it } from 'vitest';
import { filterUiDecisionActions, partitionDecisionActionsForUi } from './decision-action-visibility.util';
import type { DecisionAction } from '@/types/unified-decision';

const allowedAction: DecisionAction = {
  actionId: 'opt_a',
  label: '方案 A',
  allowed: true,
};

const blockedAction: DecisionAction = {
  actionId: 'repair_blocked',
  label: '约束求解',
  allowed: false,
  blockedReason: '当前方案不可执行',
  source: 'CONSTRAINT_SOLVER',
};

describe('decision-action-visibility', () => {
  it('filters allowed:false from default UI', () => {
    const { visible, suppressed } = partitionDecisionActionsForUi([
      allowedAction,
      blockedAction,
    ]);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.actionId).toBe('opt_a');
    expect(suppressed).toHaveLength(1);
    expect(filterUiDecisionActions([allowedAction, blockedAction])).toEqual([allowedAction]);
  });
});
