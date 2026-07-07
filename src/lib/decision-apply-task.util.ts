import { normalizeApplyDecisionProblemResponse } from '@/lib/decision-resolution.util';
import type {
  ApplyDecisionProblemResponse,
  DecisionProblemApplyAcceptedView,
  DecisionProblemApplyTaskStatus,
  DecisionProblemApplyTaskView,
} from '@/types/unified-decision';

export const DEFAULT_APPLY_TASK_POLL_INTERVAL_MS = 2000;
export const MAX_APPLY_TASK_POLL_ATTEMPTS = 90;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readOptionalString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function readOptionalNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeTaskStatus(raw: unknown): DecisionProblemApplyTaskStatus | string {
  const value = String(raw ?? 'PENDING').trim().toUpperCase();
  return value || 'PENDING';
}

export function normalizeApplyAcceptedResponse(raw: unknown): DecisionProblemApplyAcceptedView {
  const record = asRecord(raw) ?? {};
  const taskId = readOptionalString(record.taskId ?? record.task_id);
  if (!taskId) {
    throw new Error('apply 异步响应缺少 taskId');
  }
  return {
    schemaId: readOptionalString(record.schemaId ?? record.schema_id),
    taskId,
    status: normalizeTaskStatus(record.status),
    pollUrl: readOptionalString(record.pollUrl ?? record.poll_url),
    pollIntervalMs:
      readOptionalNumber(record.pollIntervalMs ?? record.poll_interval_ms) ??
      DEFAULT_APPLY_TASK_POLL_INTERVAL_MS,
    reused: record.reused === true,
  };
}

function normalizeApplyTaskError(raw: unknown): DecisionProblemApplyTaskView['error'] {
  const record = asRecord(raw);
  if (!record) {
    if (typeof raw === 'string' && raw.trim()) return { message: raw.trim() };
    return undefined;
  }
  return {
    code: readOptionalString(record.code),
    message: readOptionalString(record.message),
    details: record.details,
  };
}

export function normalizeApplyTaskResponse(raw: unknown): DecisionProblemApplyTaskView {
  const record = asRecord(raw) ?? {};
  const taskId = readOptionalString(record.taskId ?? record.task_id);
  if (!taskId) {
    throw new Error('apply 任务响应缺少 taskId');
  }

  const resultRaw = record.result;
  const result = resultRaw
    ? normalizeApplyDecisionProblemResponse(resultRaw)
    : undefined;

  return {
    schemaId: readOptionalString(record.schemaId ?? record.schema_id),
    taskId,
    status: normalizeTaskStatus(record.status),
    pollIntervalMs:
      readOptionalNumber(record.pollIntervalMs ?? record.poll_interval_ms) ??
      DEFAULT_APPLY_TASK_POLL_INTERVAL_MS,
    result,
    error: normalizeApplyTaskError(record.error),
  };
}

export function isApplyTaskTerminalStatus(
  status: string | undefined | null,
): status is 'READY' | 'FAILED' {
  const normalized = String(status ?? '').trim().toUpperCase();
  return normalized === 'READY' || normalized === 'FAILED';
}

export function resolveApplyTaskPollPath(
  accepted: Pick<DecisionProblemApplyAcceptedView, 'pollUrl' | 'taskId'>,
  tripId: string,
  problemId: string,
): string {
  const pollUrl = accepted.pollUrl?.trim();
  if (pollUrl) {
    if (pollUrl.startsWith('/api/')) return pollUrl.slice(4);
    if (pollUrl.startsWith('/trips/')) return pollUrl;
  }
  return `/trips/${encodeURIComponent(tripId)}/decision-problems/${encodeURIComponent(problemId)}/apply-tasks/${encodeURIComponent(accepted.taskId)}`;
}

export function applyTaskStatusMessage(status: string | undefined | null): string | null {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'PENDING':
      return '应用任务排队中…';
    case 'APPLYING':
      return '正在写入行程…';
    case 'REVALIDATING':
      return '正在复核行程可行性…';
    default:
      return null;
  }
}

export type StartApplyProblemDecisionResult =
  | { mode: 'async'; accepted: DecisionProblemApplyAcceptedView }
  | { mode: 'sync'; result: ApplyDecisionProblemResponse };

export function isAsyncApplyUnsupportedError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 404 || status === 501 || status === 405) return true;
  if (err instanceof Error) {
    return /not_found|not implemented|async apply/i.test(err.message);
  }
  return false;
}
