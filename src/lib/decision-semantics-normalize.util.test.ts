import { describe, expect, it } from 'vitest';
import {
  normalizeDecisionCenterOverview,
  normalizeDecisionOption,
  normalizeRecentDecisionSnapshot,
} from '@/lib/decision-semantics-normalize.util';

describe('decision-semantics-normalize.util', () => {
  it('maps BFF overview item (decisionId + executionStatus + needsRepair)', () => {
    const normalized = normalizeRecentDecisionSnapshot({
      decisionId: 'dec_1',
      executionStatus: 'PARTIALLY_APPLIED',
      recordStatus: 'PARTIALLY_APPLIED',
      needsRepair: true,
      status: 'PARTIALLY_APPLIED',
    } as never);
    expect(normalized.id).toBe('dec_1');
    expect(normalized.executionStatus).toBe('PARTIALLY_APPLIED');
    expect(normalized.needsRepair).toBe(true);
    expect(normalized.recordStatus).toBe('PARTIALLY_APPLIED');
  });

  it('normalizes overview recentDecisions', () => {
    const overview = normalizeDecisionCenterOverview({
      headline: 'test',
      problemCounts: { open: 1, byEnforcement: {} },
      feasibility: { canStartExecute: false, mustHandleCount: 1 },
      actionableProblemCount: 1,
      recentDecisions: [{ decisionId: 'dec_a' } as never],
    });
    expect(overview.recentDecisions?.[0]?.id).toBe('dec_a');
  });

  it('maps option title to label and requiredApprover to approver', () => {
    const option = normalizeDecisionOption({
      id: 'option-1',
      title: '查看详情',
      authority: { requiredApprover: 'TRIP_OWNER', executionMode: 'EXPLICIT_CONFIRMATION' },
    } as never);
    expect(option.label).toBe('查看详情');
    expect(option.authority?.approver).toBe('TRIP_OWNER');
  });
});
