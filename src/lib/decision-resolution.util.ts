import type {
  ApplyDecisionProblemResponse,
  DecisionExecutionStatusSurface,
  DecisionProblemResolutionView,
  DecisionWorkflowStatus,
  SubmitDecisionResolutionRequest,
  SubmitDecisionResolutionResponse,
} from '@/types/unified-decision';
import {
  normalizeSuggestedSubTasks,
  normalizeStructuredSuggestedFollowUps,
} from '@/lib/decision-collaborative-sub-task.util';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import { normalizeCausalTraceReference } from '@/lib/causal-trace-view.util';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function buildResolutionIdempotencyKey(
  tripId: string,
  problemId: string,
  selectedActionId: string,
): string {
  return `resolution:${tripId}:${problemId}:${selectedActionId}`;
}

function readOptionalString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

/** POST .../resolutions 请求体归一（selectedActionId SSOT；兼容 actionId / optionId 别名） */
export function normalizeSubmitResolutionRequest(
  raw: SubmitDecisionResolutionRequest | Record<string, unknown>,
): SubmitDecisionResolutionRequest {
  const record = raw as Record<string, unknown>;
  const selectedActionId =
    readOptionalString(record.selectedActionId) ??
    readOptionalString(record.selected_action_id) ??
    readOptionalString(record.actionId) ??
    readOptionalString(record.action_id) ??
    readOptionalString(record.optionId) ??
    readOptionalString(record.option_id) ??
    readOptionalString(record.selectedOptionId) ??
    readOptionalString(record.selected_option_id);

  if (!selectedActionId) {
    throw new Error(
      'DECISION_ACTION_REQUIRED: provide selectedActionId (alias: actionId, optionId, selectedOptionId)',
    );
  }

  const acknowledgement = Array.isArray(record.acknowledgement)
    ? record.acknowledgement.map((item) => String(item).trim()).filter(Boolean)
    : undefined;

  return {
    selectedActionId,
    causalTraceRef: normalizeCausalTraceReference(
      record.causalTraceRef ?? record.causal_trace_ref,
    ),
    idempotencyKey:
      readOptionalString(record.idempotencyKey) ??
      readOptionalString(record.idempotency_key),
    reason: readOptionalString(record.reason),
    acknowledgement: acknowledgement?.length ? acknowledgement : undefined,
  };
}

export function normalizeDecisionProblemResolution(
  raw: unknown,
): DecisionProblemResolutionView | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const resolutionId = String(
    record.resolutionId ?? record.resolution_id ?? record.id ?? '',
  ).trim();
  if (!resolutionId) return undefined;

  return {
    resolutionId,
    status: typeof record.status === 'string' ? record.status : undefined,
    selectedActionId:
      typeof record.selectedActionId === 'string'
        ? record.selectedActionId
        : typeof record.selected_action_id === 'string'
          ? record.selected_action_id
          : undefined,
    nextStep:
      typeof record.nextStep === 'string'
        ? record.nextStep
        : typeof record.next_step === 'string'
          ? record.next_step
          : undefined,
  };
}

function normalizeProblemSurface(raw: unknown): {
  workflowStatus?: DecisionWorkflowStatus;
  executionStatus?: DecisionExecutionStatusSurface | string;
} {
  const record = asRecord(raw);
  if (!record) return {};
  const workflowStatus =
    (typeof record.workflowStatus === 'string'
      ? record.workflowStatus
      : typeof record.workflow_status === 'string'
        ? record.workflow_status
        : undefined) as DecisionWorkflowStatus | undefined;
  const executionStatus =
    (typeof record.executionStatus === 'string'
      ? record.executionStatus
      : typeof record.execution_status === 'string'
        ? record.execution_status
        : undefined) as DecisionExecutionStatusSurface | string | undefined;
  return { workflowStatus, executionStatus };
}

function normalizeSuggestedFollowUps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const record = asRecord(item);
      if (!record) return '';
      return String(record.title ?? record.label ?? record.text ?? '').trim();
    })
    .filter(Boolean);
}

export function normalizeSubmitDecisionResolutionResponse(
  raw: unknown,
): SubmitDecisionResolutionResponse {
  const record = asRecord(raw) ?? {};
  const resolution = normalizeDecisionProblemResolution(record.resolution);
  const problem = normalizeProblemSurface(record.problem);
  const collaborativeTaskRaw = asRecord(record.collaborativeTask ?? record.collaborative_task);
  const suggestedFollowUps = normalizeSuggestedFollowUps(
    record.suggestedFollowUps ?? record.suggested_follow_ups,
  );
  const structuredSuggestedFollowUps = normalizeStructuredSuggestedFollowUps(
    record.suggestedFollowUps ?? record.suggested_follow_ups,
  );

  const collaborativeTask = collaborativeTaskRaw
    ? {
        resolutionId:
          typeof collaborativeTaskRaw.resolutionId === 'string'
            ? collaborativeTaskRaw.resolutionId
            : typeof collaborativeTaskRaw.resolution_id === 'string'
              ? collaborativeTaskRaw.resolution_id
              : resolution?.resolutionId,
        actionPlanId:
          typeof collaborativeTaskRaw.actionPlanId === 'string'
            ? collaborativeTaskRaw.actionPlanId
            : typeof collaborativeTaskRaw.action_plan_id === 'string'
              ? collaborativeTaskRaw.action_plan_id
              : undefined,
        problemId:
          typeof collaborativeTaskRaw.problemId === 'string'
            ? collaborativeTaskRaw.problemId
            : undefined,
        decisionProblemId:
          typeof collaborativeTaskRaw.decisionProblemId === 'string'
            ? collaborativeTaskRaw.decisionProblemId
            : typeof collaborativeTaskRaw.decision_problem_id === 'string'
              ? collaborativeTaskRaw.decision_problem_id
              : undefined,
      }
    : undefined;

  return {
    resolution: resolution ?? {
      resolutionId: '',
      selectedActionId:
        typeof record.selectedActionId === 'string' ? record.selectedActionId : undefined,
    },
    nextStep:
      typeof record.nextStep === 'string'
        ? record.nextStep
        : resolution?.nextStep,
    problem: Object.keys(problem).length ? problem : undefined,
    suggestedFollowUps: suggestedFollowUps.length ? suggestedFollowUps : undefined,
    structuredSuggestedFollowUps: structuredSuggestedFollowUps.length
      ? structuredSuggestedFollowUps
      : undefined,
    collaborativeTask,
  };
}

export function normalizeApplyDecisionProblemResponse(
  raw: unknown,
): ApplyDecisionProblemResponse {
  const record = asRecord(raw) ?? {};
  const problem = normalizeProblemSurface(record.problem);
  const applyResultRaw = asRecord(record.applyResult ?? record.apply_result);
  const revalidationRaw = asRecord(record.revalidation);
  const collaborativeTaskRaw = asRecord(record.collaborativeTask ?? record.collaborative_task);
  const suggestedSubTasks = normalizeSuggestedSubTasks(
    record.suggestedSubTasks ?? record.suggested_sub_tasks,
  );

  const collaborativeTask = collaborativeTaskRaw
    ? {
        resolutionId:
          typeof collaborativeTaskRaw.resolutionId === 'string'
            ? collaborativeTaskRaw.resolutionId
            : typeof collaborativeTaskRaw.resolution_id === 'string'
              ? collaborativeTaskRaw.resolution_id
              : undefined,
        actionPlanId:
          typeof collaborativeTaskRaw.actionPlanId === 'string'
            ? collaborativeTaskRaw.actionPlanId
            : typeof collaborativeTaskRaw.action_plan_id === 'string'
              ? collaborativeTaskRaw.action_plan_id
              : undefined,
        problemId:
          typeof collaborativeTaskRaw.problemId === 'string'
            ? collaborativeTaskRaw.problemId
            : typeof collaborativeTaskRaw.decisionProblemId === 'string'
              ? collaborativeTaskRaw.decisionProblemId
              : typeof collaborativeTaskRaw.decision_problem_id === 'string'
                ? collaborativeTaskRaw.decision_problem_id
                : undefined,
        decisionProblemId:
          typeof collaborativeTaskRaw.decisionProblemId === 'string'
            ? collaborativeTaskRaw.decisionProblemId
            : typeof collaborativeTaskRaw.decision_problem_id === 'string'
              ? collaborativeTaskRaw.decision_problem_id
              : undefined,
      }
    : undefined;

  const resolution = normalizeDecisionProblemResolution(record.resolution);

  return {
    resolution,
    problem: Object.keys(problem).length ? problem : undefined,
    applyResult: applyResultRaw
      ? {
          actionPlanId:
            typeof applyResultRaw.actionPlanId === 'string'
              ? applyResultRaw.actionPlanId
              : typeof applyResultRaw.action_plan_id === 'string'
                ? applyResultRaw.action_plan_id
                : collaborativeTask?.actionPlanId,
          status: typeof applyResultRaw.status === 'string' ? applyResultRaw.status : undefined,
          message:
            typeof applyResultRaw.message === 'string'
              ? applyResultRaw.message
              : typeof applyResultRaw.detail === 'string'
                ? applyResultRaw.detail
                : undefined,
        }
      : collaborativeTask?.actionPlanId
        ? { actionPlanId: collaborativeTask.actionPlanId }
        : undefined,
    revalidation: revalidationRaw
      ? {
          status:
            typeof revalidationRaw.status === 'string' ? revalidationRaw.status : undefined,
        }
      : undefined,
    suggestedSubTasks: suggestedSubTasks.length ? suggestedSubTasks : undefined,
    collaborativeTask,
  };
}

export type DecisionResolutionCtaPhase = 'select_action' | 'apply' | 'done';

export type RefreshResolutionBindingResult =
  | { ok: true; resolutionId?: string }
  | { ok: false };

export function resolveDecisionResolutionCtaPhase(
  detail: Pick<
    GatewayDecisionProblemDetailResult,
    'executionStatus' | 'workflowStatus' | 'resolution'
  > | null | undefined,
): DecisionResolutionCtaPhase {
  if (!detail) return 'select_action';

  const executionStatus = String(detail.executionStatus ?? '').toUpperCase();
  if (executionStatus === 'APPLIED' || executionStatus === 'EXECUTED') return 'done';

  const resolution = detail.resolution;
  const resolutionStatus = String(resolution?.status ?? '').toUpperCase();
  const workflowStatus = String(detail.workflowStatus ?? '').toUpperCase();

  if (
    resolutionStatus === 'AUTHORIZED' ||
    resolutionStatus === 'PROPOSED' ||
    resolution?.nextStep === 'APPLY' ||
    workflowStatus === 'DECIDED'
  ) {
    return 'apply';
  }

  return 'select_action';
}

export function writeChainSubmitHint(
  writeChain: import('@/types/unified-decision').DecisionWriteChain,
): string {
  if (writeChain === 'EVALUATE_AUTHORIZE_EXECUTE') {
    return '提交后将生成 Plan Gate 草案；确认后再应用到行程。';
  }
  return '提交结论后，再确认「应用到行程」。';
}

export interface DecisionProblemTaskBinding {
  problemId: string;
  resolutionId?: string;
  actionPlanId?: string;
}

/** 协作子任务应引用的决策绑定（submit 后有 resolutionId，apply 后有 actionPlanId） */
export function resolveDecisionProblemTaskBinding(
  problemId: string,
  detail: Pick<GatewayDecisionProblemDetailResult, 'resolution' | 'actionPlanId'> | null | undefined,
  overrides?: { actionPlanId?: string | null },
): DecisionProblemTaskBinding {
  const binding: DecisionProblemTaskBinding = { problemId };
  const resolutionId = detail?.resolution?.resolutionId?.trim();
  if (resolutionId) binding.resolutionId = resolutionId;

  const actionPlanId = (overrides?.actionPlanId ?? detail?.actionPlanId)?.trim();
  if (actionPlanId) binding.actionPlanId = actionPlanId;

  return binding;
}

/** 写操作后 invalidate 的 query key 前缀 */
export function decisionProblemWriteQueryKeys(tripId: string): readonly (readonly string[])[] {
  return [
    ['trips', tripId, 'decision-problems'],
    ['trips', tripId, 'planning-conflicts'],
    ['trips', tripId, 'decision-center'],
    ['trips', tripId, 'collaborative-tasks'],
    ['trips', tripId, 'decision-follow-up-tasks'],
    ['trips', tripId, 'feasibility-report'],
    ['trips', tripId, 'collab-overview'],
    ['trips', tripId],
  ];
}
