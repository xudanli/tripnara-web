/**
 * Decision Center 执行态联调 / E2E mock harness（DC-FE-014~018）
 */
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
  DecisionRecord,
} from '@/types/decision-problem';
import { buildDecisionIdempotencyKey } from '@/generated/decision-semantics-contracts';

export const HARNESS_TRIP_ID = 'trip_harness_1';
export const HARNESS_PROBLEM_ID = 'prob_harness_1';
export const HARNESS_OPTION_ID = 'opt_repair_a';
export const HARNESS_CLIENT_ATTEMPT = 'attempt_harness_stable';
export const HARNESS_DECISION_ID = 'dec_harness_1';
export const HARNESS_EFFECTIVE_DECISION_ID = 'dec_harness_original';

function baseDecision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: HARNESS_DECISION_ID,
    tripId: HARNESS_TRIP_ID,
    problemId: HARNESS_PROBLEM_ID,
    selectedOptionId: HARNESS_OPTION_ID,
    status: 'EXECUTED',
    tripVersionBefore: 'rev_10',
    tripVersionAfter: 'rev_11',
    ...overrides,
  };
}

export function harnessIdempotencyKey(
  clientAttemptId = HARNESS_CLIENT_ATTEMPT,
): string {
  return buildDecisionIdempotencyKey({
    tripId: HARNESS_TRIP_ID,
    problemId: HARNESS_PROBLEM_ID,
    selectedOptionId: HARNESS_OPTION_ID,
    clientAttemptId,
  });
}

export function harnessCreateBody(
  clientAttemptId = HARNESS_CLIENT_ATTEMPT,
): CreateDecisionRequest {
  return {
    problemId: HARNESS_PROBLEM_ID,
    selectedOptionId: HARNESS_OPTION_ID,
    execute: true,
    idempotencyKey: harnessIdempotencyKey(clientAttemptId),
  };
}

/** DC-FE-014 — 正常 apply → APPLIED */
export function mockSuccessApplyResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({ tripVersionAfter: 'rev_11' }),
    tripVersionAfter: 'rev_11',
    executionStatus: {
      status: 'APPLIED',
      explanation: '变更已写入行程',
      repairCommandApplied: true,
    },
    problemResolution: {
      problemId: HARNESS_PROBLEM_ID,
      status: 'RESOLVED',
      resolvedAt: '2026-06-30T00:00:00Z',
      resolvedByDecisionId: HARNESS_DECISION_ID,
      resolution: 'DECISION_EXECUTED',
    },
  };
}

/** DC-FE-014 — 异步 APPLYING → APPLIED 轮询 */
export function mockApplyingThenAppliedPollSequence(): DecisionExecutionStatusResponse[] {
  return [
    { status: 'APPLYING', explanation: '正在写入…' },
    { status: 'APPLIED', explanation: '变更已写入行程', repairCommandApplied: true },
  ];
}

export function mockApplyingCreateResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({ status: 'APPROVED' }),
    executionStatus: { status: 'APPLYING', explanation: '正在写入…' },
  };
}

/** DC-FE-015 — 幂等 replay */
export function mockIdempotentReplayResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({ id: 'dec_replay_echo' }),
    idempotentReplay: true,
    effectiveDecisionId: HARNESS_EFFECTIVE_DECISION_ID,
    executionStatus: {
      status: 'IDEMPOTENT_REPLAY',
      explanation: '该方案已处理过',
    },
    tripVersionAfter: 'rev_11',
  };
}

/** DC-FE-016 — DATA_STALE */
export function mockStaleEvidenceResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({ tripVersionAfter: 'rev_10' }),
    tripVersionAfter: 'rev_10',
    executionStatus: {
      status: 'DATA_STALE',
      explanation: '路况/天气证据已过期',
      evidenceFreshnessBlock: {
        blocked: true,
        staleEvidenceTypes: ['TRAFFIC', 'WEATHER'],
        message: '请刷新路况/天气后重新预览',
      },
    },
  };
}

/** DC-FE-017 — PARTIALLY_APPLIED */
export function mockPartialApplyResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({ tripVersionAfter: 'rev_11' }),
    tripVersionAfter: 'rev_11',
    executionStatus: {
      status: 'PARTIALLY_APPLIED',
      explanation: '部分路段未能写入',
      needsRepair: true,
      postApplyCoherence: {
        coherent: false,
        needsRepair: true,
        failureMessage: 'Day 2 换路线失败，需继续修复',
      },
      repairCommandApplied: true,
    },
  };
}

/** DC-FE-012 — ROLLED_BACK */
export function mockRolledBackResponse(): CreateDecisionResponse {
  return {
    decision: baseDecision({
      tripVersionBefore: 'rev_10',
      tripVersionAfter: 'rev_10',
    }),
    tripVersionAfter: 'rev_10',
    executionStatus: {
      status: 'ROLLED_BACK',
      explanation: '写入失败，行程已回滚至 rev_10',
      repairCommandApplied: false,
    },
  };
}

export interface RefreshGateResult {
  refreshCalls: number;
  lastResult: CreateDecisionResponse | null;
}

/**
 * 模拟 L4 confirm 后的刷新 gate（DC-FE-009）。
 * 仅 shouldRefreshItinerary === true 时递增 refreshCalls。
 */
export async function simulateConfirmWithRefreshGate(
  execute: () => Promise<{
    response: CreateDecisionResponse;
    classification: { shouldRefreshItinerary: boolean };
  }>,
): Promise<RefreshGateResult> {
  let refreshCalls = 0;
  const { response, classification } = await execute();
  if (classification.shouldRefreshItinerary) {
    refreshCalls += 1;
  }
  return { refreshCalls, lastResult: response };
}

/** DC-FE-013 — stale 证据刷新导航目标 */
export function resolveStaleEvidenceRefreshTarget(input: {
  tripId: string;
  sourceIssueId?: string | null;
}): { event: 'plan-studio:open-feasibility'; tripId: string; issueId?: string } {
  return {
    event: 'plan-studio:open-feasibility',
    tripId: input.tripId,
    issueId: input.sourceIssueId ?? undefined,
  };
}

/** 记录 mock API 调用次数（联调断言） */
export function createDecisionApiCallTracker() {
  const createCalls: CreateDecisionRequest[] = [];
  const pollCalls: string[] = [];
  return {
    createCalls,
    pollCalls,
    trackCreate(body: CreateDecisionRequest) {
      createCalls.push(body);
    },
    trackPoll(decisionId: string) {
      pollCalls.push(decisionId);
    },
  };
}
