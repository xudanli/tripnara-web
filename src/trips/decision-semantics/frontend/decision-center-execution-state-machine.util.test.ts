import { describe, expect, it } from 'vitest';
import {
  buildDecisionIdempotencyKey,
  classifyCreateDecisionOutcome,
  classifyExecutionStatusPoll,
  isDecisionPendingAttention,
  shouldPollDecisionExecution,
} from '@/generated/decision-semantics-contracts';
import type {
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
} from '@/types/decision-problem';

function execution(
  status: string,
  extra: Partial<DecisionExecutionStatusResponse> = {},
): DecisionExecutionStatusResponse {
  return { status, ...extra };
}

function createResponse(
  partial: Partial<CreateDecisionResponse> & {
    decision: CreateDecisionResponse['decision'];
  },
): CreateDecisionResponse {
  return partial as CreateDecisionResponse;
}

describe('decision-center-execution-state-machine.util', () => {
  it('classifies APPLIED as success with refresh + toast', () => {
    const result = classifyExecutionStatusPoll(execution('APPLIED'));
    expect(result.variant).toBe('success');
    expect(result.shouldRefreshItinerary).toBe(true);
    expect(result.shouldShowSuccessToast).toBe(true);
    expect(result.isTerminal).toBe(true);
    expect(result.shouldPoll).toBe(false);
  });

  it('classifies APPLYING as in_progress and keeps polling', () => {
    const result = classifyExecutionStatusPoll(execution('APPLYING'));
    expect(result.variant).toBe('in_progress');
    expect(result.shouldPoll).toBe(true);
    expect(shouldPollDecisionExecution('APPLYING')).toBe(true);
    expect(shouldPollDecisionExecution('APPLIED')).toBe(false);
  });

  it('classifies idempotent replay without refresh or success toast', () => {
    const result = classifyCreateDecisionOutcome(
      createResponse({
        idempotentReplay: true,
        effectiveDecisionId: 'dec_original',
        decision: {
          id: 'dec_replay',
          tripId: 'trip_1',
          problemId: 'prob_1',
          selectedOptionId: 'opt_1',
          status: 'EXECUTED',
        },
        executionStatus: execution('IDEMPOTENT_REPLAY'),
      }),
    );
    expect(result.variant).toBe('neutral_replay');
    expect(result.shouldRefreshItinerary).toBe(false);
    expect(result.shouldShowSuccessToast).toBe(false);
    expect(result.effectiveDecisionId).toBe('dec_original');
  });

  it('classifies replay when only executionStatus string is IDEMPOTENT_REPLAY', () => {
    const result = classifyCreateDecisionOutcome(
      createResponse({
        decision: {
          id: 'dec_1',
          tripId: 'trip_1',
          problemId: 'prob_1',
          selectedOptionId: 'opt_1',
          status: 'EXECUTED',
        },
        executionStatus: 'IDEMPOTENT_REPLAY' as unknown as DecisionExecutionStatusResponse,
      }),
    );
    expect(result.variant).toBe('neutral_replay');
    expect(result.shouldRefreshItinerary).toBe(false);
  });

  it('classifies PARTIALLY_APPLIED with needsRepair as warning', () => {
    const result = classifyExecutionStatusPoll(
      execution('PARTIALLY_APPLIED', {
        needsRepair: true,
        postApplyCoherence: { coherent: false, failureMessage: '部分路段未写入' },
      }),
    );
    expect(result.variant).toBe('warning_needs_repair');
    expect(result.needsRepair).toBe(true);
    expect(result.shouldShowSuccessToast).toBe(false);
    expect(isDecisionPendingAttention('PARTIALLY_APPLIED')).toBe(true);
  });

  it('classifies ROLLED_BACK as error without refresh', () => {
    const result = classifyExecutionStatusPoll(execution('ROLLED_BACK'));
    expect(result.variant).toBe('error_rolled_back');
    expect(result.shouldRefreshItinerary).toBe(false);
    expect(isDecisionPendingAttention('ROLLED_BACK')).toBe(true);
  });

  it('classifies DATA_STALE / evidenceFreshnessBlock as blocked_stale_evidence', () => {
    const result = classifyExecutionStatusPoll(
      execution('DATA_STALE', {
        evidenceFreshnessBlock: {
          blocked: true,
          staleEvidenceTypes: ['TRAFFIC', 'WEATHER'],
          message: '路况数据过期',
        },
      }),
    );
    expect(result.variant).toBe('blocked_stale_evidence');
    expect(result.shouldRefreshItinerary).toBe(false);
    expect(isDecisionPendingAttention('DATA_STALE')).toBe(true);
  });

  it('classifies FAILED as error_failed', () => {
    const result = classifyExecutionStatusPoll(execution('FAILED', { explanation: 'apply error' }));
    expect(result.variant).toBe('error_failed');
    expect(result.shouldShowSuccessToast).toBe(false);
  });

  it('classifies createDecision when executionStatus is a plain string (BFF compat)', () => {
    const result = classifyCreateDecisionOutcome(
      {
        decision: { id: 'd1', status: 'PROPOSED', problemId: 'p1', selectedOptionId: 'o1' },
        executionStatus: 'RECORDED' as unknown as DecisionExecutionStatusResponse,
      },
      { execute: true },
    );
    expect(result.variant).toBe('in_progress');
    expect(result.shouldPoll).toBe(true);
    expect(result.shouldShowSuccessToast).toBe(false);
  });

  it('buildDecisionIdempotencyKey is stable for the same client attempt', () => {
    const input = {
      tripId: 'trip_a',
      problemId: 'prob_b',
      selectedOptionId: 'opt_c',
      clientAttemptId: 'attempt_xyz',
    };
    expect(buildDecisionIdempotencyKey(input)).toBe(
      'dec_trip_a_prob_b_opt_c_attempt_xyz',
    );
    expect(buildDecisionIdempotencyKey(input)).toBe(buildDecisionIdempotencyKey(input));
  });
});
