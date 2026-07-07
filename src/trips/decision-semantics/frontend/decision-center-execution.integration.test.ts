import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decisionProblemsApi } from '@/api/decision-problems';
import { classifyCreateDecisionOutcome } from '@/generated/decision-semantics-contracts';
import { countPendingAttentionDecisions, partitionDecisionProblems } from '@/lib/decision-center.util';
import { executeDecisionWithPolling } from '@/lib/decision-problem-repair-bridge.util';
import { runDecisionConfirmWithExecutionGate } from '@/generated/decision-semantics-contracts';
import {
  HARNESS_CLIENT_ATTEMPT,
  HARNESS_DECISION_ID,
  HARNESS_EFFECTIVE_DECISION_ID,
  HARNESS_TRIP_ID,
  createDecisionApiCallTracker,
  harnessCreateBody,
  mockApplyingCreateResponse,
  mockApplyingThenAppliedPollSequence,
  mockIdempotentReplayResponse,
  mockPartialApplyResponse,
  mockRolledBackResponse,
  mockStaleEvidenceResponse,
  mockSuccessApplyResponse,
  resolveStaleEvidenceRefreshTarget,
  simulateConfirmWithRefreshGate,
} from './decision-center-execution.harness';
import type { DecisionProblemSummary } from '@/types/decision-problem';

vi.mock('@/api/decision-problems', () => ({
  decisionProblemsApi: {
    createDecision: vi.fn(),
    getDecisionExecutionStatus: vi.fn(),
    isNotImplemented: vi.fn(() => false),
  },
}));

describe('DC-FE-014 — normal apply → success + itinerary refresh gate', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
    vi.mocked(decisionProblemsApi.getDecisionExecutionStatus).mockReset();
  });

  it('classifies APPLIED as success and triggers refresh once', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockSuccessApplyResponse());

    const gate = await simulateConfirmWithRefreshGate(async () => {
      const result = await executeDecisionWithPolling({
        tripId: HARNESS_TRIP_ID,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
        body: harnessCreateBody(),
        executionCapability: 'DIRECT',
      });
      return { response: result.response, classification: result.classification };
    });

    expect(gate.refreshCalls).toBe(1);
    expect(gate.lastResult?.executionStatus?.status).toBe('APPLIED');
    expect(gate.lastResult?.tripVersionAfter).toBe('rev_11');
  });

  it('polls APPLYING until APPLIED then refreshes', async () => {
    const pollSeq = mockApplyingThenAppliedPollSequence();
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockApplyingCreateResponse());
    vi.mocked(decisionProblemsApi.getDecisionExecutionStatus)
      .mockResolvedValueOnce(pollSeq[1]!);

    const result = await executeDecisionWithPolling({
      tripId: HARNESS_TRIP_ID,
      clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      body: harnessCreateBody(),
      executionCapability: 'DIRECT',
    });

    expect(decisionProblemsApi.getDecisionExecutionStatus).toHaveBeenCalledTimes(1);
    expect(result.classification.variant).toBe('success');
    expect(result.classification.shouldRefreshItinerary).toBe(true);
    expect(result.classification.shouldShowSuccessToast).toBe(true);
  });
});

describe('DC-FE-015 — double confirm → replay, no second refresh', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
    vi.mocked(decisionProblemsApi.getDecisionExecutionStatus).mockReset();
  });

  it('second call with same idempotencyKey is neutral_replay without refresh', async () => {
    const tracker = createDecisionApiCallTracker();
    vi.mocked(decisionProblemsApi.createDecision).mockImplementation(async (_tripId, body) => {
      tracker.trackCreate(body);
      if (tracker.createCalls.length === 1) return mockSuccessApplyResponse();
      return mockIdempotentReplayResponse();
    });

    const body = harnessCreateBody();
    const first = await executeDecisionWithPolling({
      tripId: HARNESS_TRIP_ID,
      clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      body,
      executionCapability: 'DIRECT',
    });
    const second = await executeDecisionWithPolling({
      tripId: HARNESS_TRIP_ID,
      clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      body,
      executionCapability: 'DIRECT',
    });

    expect(tracker.createCalls).toHaveLength(2);
    expect(tracker.createCalls[0]?.idempotencyKey).toBe(tracker.createCalls[1]?.idempotencyKey);

    const firstGate = await simulateConfirmWithRefreshGate(async () => ({
      response: first.response,
      classification: first.classification,
    }));
    const secondGate = await simulateConfirmWithRefreshGate(async () => ({
      response: second.response,
      classification: second.classification,
    }));

    expect(firstGate.refreshCalls).toBe(1);
    expect(secondGate.refreshCalls).toBe(0);
    expect(second.classification.variant).toBe('neutral_replay');
    expect(second.classification.shouldShowSuccessToast).toBe(false);
    expect(second.response.effectiveDecisionId).toBe(HARNESS_EFFECTIVE_DECISION_ID);
  });
});

describe('DC-FE-016 — stale evidence → blocked_stale_evidence, no refresh', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
  });

  it('does not refresh itinerary on DATA_STALE', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockStaleEvidenceResponse());

    const gate = await simulateConfirmWithRefreshGate(async () => {
      const result = await executeDecisionWithPolling({
        tripId: HARNESS_TRIP_ID,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
        body: harnessCreateBody(),
        executionCapability: 'DIRECT',
      });
      return { response: result.response, classification: result.classification };
    });

    expect(gate.refreshCalls).toBe(0);
    expect(gate.lastResult?.executionStatus?.status).toBe('DATA_STALE');
    expect(gate.lastResult?.executionStatus?.evidenceFreshnessBlock?.staleEvidenceTypes).toEqual([
      'TRAFFIC',
      'WEATHER',
    ]);

    const target = resolveStaleEvidenceRefreshTarget({
      tripId: HARNESS_TRIP_ID,
      sourceIssueId: 'issue_traffic_1',
    });
    expect(target.event).toBe('plan-studio:open-feasibility');
    expect(target.issueId).toBe('issue_traffic_1');
  });
});

describe('DC-FE-017 — partial apply → warning + L1 pending', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
  });

  it('shows warning_needs_repair and increments L1 pending attention', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockPartialApplyResponse());

    const result = await executeDecisionWithPolling({
      tripId: HARNESS_TRIP_ID,
      clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      body: harnessCreateBody(),
      executionCapability: 'PARTIAL',
    });

    expect(result.classification.variant).toBe('warning_needs_repair');
    expect(result.classification.needsRepair).toBe(true);
    expect(result.classification.shouldShowSuccessToast).toBe(false);

    const pendingCount = countPendingAttentionDecisions([
      {
        id: HARNESS_DECISION_ID,
        problemId: 'prob_partial',
        executionStatus: 'PARTIALLY_APPLIED',
        needsRepair: true,
      },
    ]);
    expect(pendingCount).toBe(1);

    const resolvedProblem: DecisionProblemSummary = {
      id: 'prob_partial',
      type: 'INFEASIBILITY',
      title: 'partial',
      status: 'RESOLVED',
      primaryEnforcement: 'BLOCK',
      resolvedByDecisionId: HARNESS_DECISION_ID,
      resolutionKind: 'DECISION_EXECUTED',
    };
    const { open } = partitionDecisionProblems([resolvedProblem], [
      {
        id: HARNESS_DECISION_ID,
        problemId: 'prob_partial',
        executionStatus: 'PARTIALLY_APPLIED',
        needsRepair: true,
      },
    ]);
    expect(open).toHaveLength(1);
  });
});

describe('DC-FE-012 — ROLLED_BACK → no refresh, trip version unchanged', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
  });

  it('classifies rolled back without itinerary refresh', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockRolledBackResponse());

    const result = await executeDecisionWithPolling({
      tripId: HARNESS_TRIP_ID,
      clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      body: harnessCreateBody(),
      executionCapability: 'DIRECT',
    });

    expect(result.classification.variant).toBe('error_rolled_back');
    expect(result.classification.shouldRefreshItinerary).toBe(false);
    expect(result.response.tripVersionAfter).toBe('rev_10');
    expect(result.response.decision.tripVersionBefore).toBe('rev_10');
    expect(result.response.decision.tripVersionAfter).toBe('rev_10');
  });
});

describe('DC-FE-018 — feasibility path uses same gate as L4 drawer', () => {
  beforeEach(() => {
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
  });

  it('feasibility confirmApply equivalent: stale without refresh', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockStaleEvidenceResponse());
    const onApplied = vi.fn();

    const result = await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary: onApplied },
    );

    expect(result.classification.variant).toBe('blocked_stale_evidence');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('feasibility confirmApply equivalent: partial warns without refresh', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockPartialApplyResponse());
    const onApplied = vi.fn();

    const result = await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary: onApplied },
    );

    expect(result.classification.variant).toBe('warning_needs_repair');
    expect(onApplied).not.toHaveBeenCalled();
  });
});

describe('DC-FE-018 — regression: classifyCreateDecisionOutcome on harness fixtures', () => {
  it('never treats replay/stale/partial as success', () => {
    for (const response of [
      mockIdempotentReplayResponse(),
      mockStaleEvidenceResponse(),
      mockPartialApplyResponse(),
      mockRolledBackResponse(),
    ]) {
      const c = classifyCreateDecisionOutcome(response);
      expect(c.variant).not.toBe('success');
      expect(c.shouldShowSuccessToast).toBe(false);
    }
    const success = classifyCreateDecisionOutcome(mockSuccessApplyResponse());
    expect(success.variant).toBe('success');
    expect(success.shouldRefreshItinerary).toBe(true);
  });
});
