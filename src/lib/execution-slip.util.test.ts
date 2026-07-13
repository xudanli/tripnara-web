import { describe, expect, it } from 'vitest';
import {
  buildDepartureSlipRequest,
  isSlipDecisionProblem,
  normalizeConsumerDecisionItem,
  resolveDepartureSlipObservedAt,
  resolvePlannedDepartAt,
  resolveSelectedRepairOptionId,
} from '@/lib/execution-slip.util';
import type { MobileTodayItineraryItemDto } from '@/types/mobile-execution';

describe('execution-slip.util', () => {
  it('detects slip decision problems by prefix', () => {
    expect(isSlipDecisionProblem('problem_exec_slip_abc')).toBe(true);
    expect(isSlipDecisionProblem('problem_other')).toBe(false);
  });

  it('resolves plannedDepartAt with metadata priority', () => {
    const item: MobileTodayItineraryItemDto = {
      id: 'act-1',
      time: '09:00',
      title: 'Activity',
      status: 'inProgress',
      endTime: '2026-07-13T10:00:00.000Z',
      metadata: {
        rfc001ExecutionActivityContext: {
          byActivityId: {
            'act-1': { plannedDepartAt: '2026-07-13T09:30:00.000Z' },
          },
        },
      },
    };
    expect(resolvePlannedDepartAt('act-1', item)).toBe('2026-07-13T09:30:00.000Z');
  });

  it('uses planned depart + delay for observedAt', () => {
    const observed = resolveDepartureSlipObservedAt({
      plannedDepartAt: '2026-07-13T09:30:00.000Z',
      delayMinutes: 15,
      stillAtPoi: false,
    });
    expect(observed).toBe('2026-07-13T09:45:00.000Z');
  });

  it('builds departure slip request from delay selection', () => {
    const request = buildDepartureSlipRequest({
      activityId: 'act-1',
      plannedDepartAt: '2026-07-13T09:30:00.000Z',
      delayMinutes: 30,
      stillAtPoi: false,
    });
    expect(request.activityId).toBe('act-1');
    expect(request.source).toBe('USER_REPORT');
    expect(request.observedAt).toBe('2026-07-13T10:00:00.000Z');
  });

  it('normalizes consumer decision repair options', () => {
    const decision = normalizeConsumerDecisionItem({
      problemId: 'problem_exec_slip_1',
      headline: '赶不上',
      impact: '影响后续',
      severity: 'BLOCK',
      repairOptions: [{ optionId: 'cand_a', title: '改去备选 POI', canApply: true }],
      requiredAcknowledgements: ['确认风险'],
      actions: { acceptRecommended: { enabled: true, actionId: 'cand_a' } },
    });
    expect(decision?.repairOptions?.[0]?.title).toBe('改去备选 POI');
    expect(resolveSelectedRepairOptionId(decision, null)).toBe('cand_a');
  });
});
