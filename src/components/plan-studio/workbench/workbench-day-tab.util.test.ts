import { describe, expect, it } from 'vitest';
import { buildWorkbenchDayTabAriaLabel } from '@/components/plan-studio/workbench/workbench-day-tab.util';

describe('buildWorkbenchDayTabAriaLabel', () => {
  it('includes conflict and selection state', () => {
    expect(
      buildWorkbenchDayTabAriaLabel(3, {
        hasConflict: true,
        hasDecision: true,
        hasSplit: false,
        isSelected: true,
      }),
    ).toBe('第 3 天，有冲突，有待决策，已选中');
  });
});
