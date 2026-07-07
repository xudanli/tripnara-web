import { describe, expect, it } from 'vitest';
import {
  buildPlanGateCommitOptions,
  isValidPartialCommitSelection,
  resolvePlanGatePartialCommitDayOptions,
} from './plan-gate-commit.util';
import {
  formatPlanGateMaterializationSummary,
  isPlanGateTimelineItem,
  stripPlanGateTimelineNotePrefix,
} from './plan-gate-timeline.util';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';

describe('plan-gate-timeline.util', () => {
  it('detects PlanGate timeline items by note prefix', () => {
    expect(isPlanGateTimelineItem('[PlanGate] 南岸酒店 → 升级酒店')).toBe(true);
    expect(isPlanGateTimelineItem('普通备注')).toBe(false);
  });

  it('strips note prefix for display', () => {
    expect(stripPlanGateTimelineNotePrefix('[PlanGate] 第2天午餐')).toBe('第2天午餐');
  });

  it('formats materialization summary', () => {
    expect(
      formatPlanGateMaterializationSummary({ added: 3, removed: 1 }),
    ).toBe('新增 3 项 · 移除 1 项');
  });
});

describe('plan-gate-commit.util', () => {
  const result = {
    uiOutput: {
      planGate: {
        draftDiff: {
          timelineChanges: [{ kind: 'stay', day: 2, label: '住宿' }],
          memberChanges: [{ day: 3, kind: 'split_added', label: '分流', impact: 'high' }],
        },
      },
    },
  } as ExecutePlanningWorkbenchResponse;

  it('collects partial commit day options from draftDiff', () => {
    expect(resolvePlanGatePartialCommitDayOptions(result, null)).toEqual([2, 3]);
  });

  it('builds partial commit options payload', () => {
    expect(buildPlanGateCommitOptions(true, [3, 2])).toEqual({
      partialCommit: true,
      commitDays: [2, 3],
    });
    expect(buildPlanGateCommitOptions(false, [2])).toBeUndefined();
  });

  it('validates partial commit selection', () => {
    expect(isValidPartialCommitSelection(false, [])).toBe(true);
    expect(isValidPartialCommitSelection(true, [])).toBe(false);
    expect(isValidPartialCommitSelection(true, [2])).toBe(true);
  });
});
