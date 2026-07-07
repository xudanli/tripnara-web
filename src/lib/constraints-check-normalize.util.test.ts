import { describe, expect, it } from 'vitest';
import {
  collectSacrificedConstraintIds,
  normalizeConstraintsCheckResponse,
  shouldSuppressScheduleViolationForSacrifice,
} from './constraints-check-normalize.util';

describe('constraints-check-normalize.util', () => {
  it('suppresses suggest_adjust schedule violation when constraint was sacrificed', () => {
    const raw = {
      issues: [
        {
          id: 'sched-lunch',
          constraintId: 'c_tpl_lunch_time_window',
          severity: 'suggest_adjust',
          issueKind: 'schedule_violation',
          message: '午餐未落在 12:00–13:30',
        },
        {
          id: 'must-budget',
          constraintId: 'c_budget_total',
          severity: 'must_handle',
          message: '超预算',
        },
      ],
      softTradeoffs: [
        {
          constraintId: 'c_tpl_lunch_time_window',
          templateId: 'lunch_time_window',
          priority: 3,
          sacrificed: true,
          message: '为保留少换酒店，午餐窗口已放宽',
        },
      ],
    };

    const normalized = normalizeConstraintsCheckResponse(raw);
    expect(normalized.issues?.some((i) => i.id === 'sched-lunch')).toBe(false);
    expect(normalized.issues?.some((i) => i.issueKind === 'soft_tradeoff')).toBe(true);
    expect(normalized.issues?.some((i) => i.id === 'must-budget')).toBe(true);
    expect(normalized.suggestAdjust).toBe(1);
  });

  it('collects sacrificed ids from sacrificedConstraintIds and tradeoffs', () => {
    const ids = collectSacrificedConstraintIds({
      sacrificedConstraintIds: ['c_tpl_budget_soft'],
      softTradeoffs: [{ constraintId: 'c_tpl_less_shopping', sacrificed: true }],
      issues: [],
    });
    expect(ids.has('c_tpl_budget_soft')).toBe(true);
    expect(ids.has('budget_soft')).toBe(true);
    expect(ids.has('c_tpl_less_shopping')).toBe(true);
    expect(ids.has('less_shopping')).toBe(true);
  });

  it('does not suppress must_handle issues for sacrificed constraints', () => {
    const sacrificed = collectSacrificedConstraintIds({
      sacrificedConstraintIds: ['c_tpl_lunch_time_window'],
    });
    expect(
      shouldSuppressScheduleViolationForSacrifice(
        {
          id: 'hard-like',
          constraintId: 'c_tpl_lunch_time_window',
          severity: 'must_handle',
        },
        sacrificed,
      ),
    ).toBe(false);
  });
});
