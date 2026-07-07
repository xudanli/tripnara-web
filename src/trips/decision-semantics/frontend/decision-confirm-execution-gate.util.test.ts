import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { decisionProblemsApi } from '@/api/decision-problems';
import {
  emitDecisionExecutionToasts,
  runDecisionConfirmWithExecutionGate,
} from './decision-confirm-execution-gate.util';
import {
  HARNESS_CLIENT_ATTEMPT,
  HARNESS_TRIP_ID,
  harnessCreateBody,
  mockIdempotentReplayResponse,
  mockPartialApplyResponse,
  mockStaleEvidenceResponse,
  mockSuccessApplyResponse,
} from './decision-center-execution.harness';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    message: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/plan-studio-loop-events', () => ({
  notifyDecisionValidationRefresh: vi.fn(),
}));

vi.mock('@/api/decision-problems', () => ({
  decisionProblemsApi: {
    createDecision: vi.fn(),
    getDecisionExecutionStatus: vi.fn(),
    isNotImplemented: vi.fn(() => false),
  },
}));

describe('decision-confirm-execution-gate.util', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(decisionProblemsApi.createDecision).mockReset();
    vi.mocked(decisionProblemsApi.getDecisionExecutionStatus).mockReset();
  });

  it('refreshes itinerary only on success', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockSuccessApplyResponse());
    const onRefreshItinerary = vi.fn();

    const result = await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary },
    );

    expect(result.classification.variant).toBe('success');
    expect(onRefreshItinerary).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('does not refresh on stale evidence', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockStaleEvidenceResponse());
    const onRefreshItinerary = vi.fn();

    const result = await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary },
    );

    expect(result.classification.variant).toBe('blocked_stale_evidence');
    expect(onRefreshItinerary).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('replay uses neutral toast without refresh', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockIdempotentReplayResponse());
    const onRefreshItinerary = vi.fn();

    await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary },
    );

    expect(onRefreshItinerary).not.toHaveBeenCalled();
    expect(toast.message).toHaveBeenCalledWith(
      '该方案已处理过',
      expect.objectContaining({ description: expect.any(String) }),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('partial apply warns without success toast or refresh', async () => {
    vi.mocked(decisionProblemsApi.createDecision).mockResolvedValue(mockPartialApplyResponse());
    const onRefreshItinerary = vi.fn();

    const result = await runDecisionConfirmWithExecutionGate(
      {
        tripId: HARNESS_TRIP_ID,
        problemId: harnessCreateBody().problemId,
        selectedOptionId: harnessCreateBody().selectedOptionId,
        clientAttemptId: HARNESS_CLIENT_ATTEMPT,
      },
      { onRefreshItinerary },
    );

    expect(result.classification.variant).toBe('warning_needs_repair');
    expect(onRefreshItinerary).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('emitDecisionExecutionToasts never success on replay', () => {
    emitDecisionExecutionToasts({
      classification: {
        variant: 'neutral_replay',
        shouldRefreshItinerary: false,
        shouldShowSuccessToast: false,
        isTerminal: true,
        shouldPoll: false,
        needsRepair: false,
      },
      response: mockIdempotentReplayResponse(),
      executionStatus: mockIdempotentReplayResponse().executionStatus ?? null,
      isApprovedOnly: false,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
