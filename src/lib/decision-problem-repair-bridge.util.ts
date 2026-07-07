import {
  DecisionSemanticsApiError,
  decisionProblemsApi,
} from '@/api/decision-problems';
import {
  buildDecisionIdempotencyKey,
  classifyCreateDecisionOutcome,
  shouldPollDecisionExecution,
} from '@/generated/decision-semantics-contracts';
import { executionCapabilityLabel } from '@/lib/decision-problem-display.util';
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
  DecisionOptionPreviewResponse,
  ExecutionCapability,
} from '@/types/decision-problem';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import type { PreviewRepairResponse } from '@/types/feasibility-repair';

export function resolveExecuteFlagForCapability(
  inputExecute: boolean | undefined,
  capability?: ExecutionCapability,
): boolean {
  if (inputExecute != null) return inputExecute;
  const normalized = capability?.toUpperCase();
  if (normalized === 'ADVISORY_ONLY' || normalized === 'GUIDED_MANUAL') return false;
  return true;
}

export function mapDecisionPreviewToRepairPreview(
  preview: DecisionOptionPreviewResponse,
  option: FeasibilityRepairOptionDto,
): PreviewRepairResponse {
  const repairMessage =
    typeof preview.repairPreview?.message === 'string'
      ? preview.repairPreview.message
      : undefined;
  const mutationSummary = preview.proposedMutations?.operations
    ?.map((op) => op.label ?? op.description ?? op.type)
    .filter(Boolean)
    .join('；');
  const message =
    repairMessage ??
    mutationSummary ??
    '决策预览已就绪，确认后将写入行程或记录批准态。';

  const capability = preview.executionCapability?.toUpperCase();
  const wouldDefer =
    capability === 'GUIDED_MANUAL' ||
    capability === 'ADVISORY_ONLY' ||
    Boolean(preview.acknowledgementRequired?.length);

  return {
    issueId: preview.problemId,
    optionId: preview.optionId,
    actionType: String(option.metadata?.decisionOptionType ?? option.actionType ?? 'decision_repair'),
    previewMode: 'decision_engine_dry_run',
    status: wouldDefer ? 'would_defer' : 'preview',
    message,
    before: { dayNumber: 0, itemCount: 0, totalItemCount: 0, highlights: [] },
    after: { dayNumber: 0, itemCount: 0, totalItemCount: 0, highlights: [] },
    itineraryDiff: [],
    impact: { feasibilityScoreBefore: 0, estimated: true },
    option,
    wouldDefer,
    humanDecisionPointsFlat: preview.acknowledgementRequired,
  };
}

export async function pollDecisionExecutionUntilTerminal(
  tripId: string,
  decisionId: string,
  initial?: DecisionExecutionStatusResponse | null,
): Promise<DecisionExecutionStatusResponse | null> {
  if (initial && !shouldPollDecisionExecution(initial.status)) return initial;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    try {
      const next = await decisionProblemsApi.getDecisionExecutionStatus(tripId, decisionId);
      if (!shouldPollDecisionExecution(next.status)) return next;
    } catch (err) {
      if (decisionProblemsApi.isNotImplemented(err)) return initial ?? null;
      throw err;
    }
  }
  return initial ?? null;
}

export interface ExecuteDecisionInput {
  tripId: string;
  body: CreateDecisionRequest;
  executionCapability?: ExecutionCapability;
  clientAttemptId?: string;
}

export interface ExecuteDecisionResult {
  response: CreateDecisionResponse;
  executionStatus: DecisionExecutionStatusResponse | null;
  classification: ReturnType<typeof classifyCreateDecisionOutcome>;
  isApprovedOnly: boolean;
  toastDescription?: string;
}

export async function executeDecisionWithPolling(
  input: ExecuteDecisionInput,
): Promise<ExecuteDecisionResult> {
  const capability = input.executionCapability;
  const execute = resolveExecuteFlagForCapability(input.body.execute, capability);
  const clientAttemptId =
    input.clientAttemptId ??
    input.body.idempotencyKey?.split('_').slice(-1)[0] ??
    crypto.randomUUID();

  const body: CreateDecisionRequest = {
    ...input.body,
    execute,
    idempotencyKey:
      input.body.idempotencyKey ??
      buildDecisionIdempotencyKey({
        tripId: input.tripId,
        problemId: input.body.problemId,
        selectedOptionId: input.body.selectedOptionId,
        clientAttemptId,
      }),
  };

  const response = await decisionProblemsApi.createDecision(input.tripId, body);
  const decisionId = response.effectiveDecisionId ?? response.decision.id;

  let executionStatus = response.executionStatus ?? null;
  let classification = classifyCreateDecisionOutcome(response, { execute });

  if (classification.shouldPoll && decisionId) {
    executionStatus = await pollDecisionExecutionUntilTerminal(
      input.tripId,
      decisionId,
      executionStatus,
    );
    if (executionStatus) {
      classification = classifyCreateDecisionOutcome(
        { ...response, executionStatus },
        { execute },
      );
    }
  }

  const capLabel = executionCapabilityLabel(capability);
  const isApprovedOnly =
    response.decision.status === 'APPROVED' ||
    capability?.toUpperCase() === 'GUIDED_MANUAL' ||
    capability?.toUpperCase() === 'ADVISORY_ONLY';

  return {
    response,
    executionStatus,
    classification,
    isApprovedOnly,
    toastDescription: isApprovedOnly
      ? capLabel ?? '方案已记录，行程可能尚未变更'
      : executionStatus?.explanation,
  };
}

export function isDecisionSemanticsApplyError(err: unknown): err is DecisionSemanticsApiError {
  return err instanceof DecisionSemanticsApiError;
}

export { buildDecisionIdempotencyKey };
