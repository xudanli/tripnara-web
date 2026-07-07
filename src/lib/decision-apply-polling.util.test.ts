import { describe, expect, it } from 'vitest';
import {
  inferExecutionStatusAfterApply,
  isApplyRevalidationSettled,
  isDecisionExecutionApplied,
  isRevalidationPending,
} from './decision-apply-polling.util';

describe('decision-apply-polling.util', () => {
  it('detects pending revalidation', () => {
    expect(isRevalidationPending('PENDING')).toBe(true);
    expect(isRevalidationPending('passed')).toBe(false);
  });

  it('detects applied execution status', () => {
    expect(isDecisionExecutionApplied('APPLIED')).toBe(true);
    expect(isDecisionExecutionApplied('EXECUTED')).toBe(true);
    expect(isDecisionExecutionApplied('APPLYING')).toBe(false);
  });

  it('infers APPLIED from settled apply with actionPlanId', () => {
    expect(
      inferExecutionStatusAfterApply({
        revalidation: { status: 'PASSED' },
        applyResult: { actionPlanId: 'plan_v1', status: 'SUCCESS' },
      }),
    ).toBe('APPLIED');
    expect(
      inferExecutionStatusAfterApply({
        revalidation: { status: 'PENDING' },
        applyResult: { actionPlanId: 'plan_v1' },
      }),
    ).toBeUndefined();
  });

  it('considers settled when applied or revalidation not pending', () => {
    expect(
      isApplyRevalidationSettled({
        problem: { executionStatus: 'APPLIED' },
        revalidation: { status: 'PENDING' },
      }),
    ).toBe(true);
    expect(
      isApplyRevalidationSettled({
        problem: { executionStatus: 'APPLYING' },
        revalidation: { status: 'PASSED' },
      }),
    ).toBe(true);
    expect(
      isApplyRevalidationSettled({
        problem: { executionStatus: 'APPLYING' },
        revalidation: { status: 'PENDING' },
      }),
    ).toBe(false);
  });
});
