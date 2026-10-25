import type { RouteAndRunResponse } from '@/api/agent';
import type { RouteRunAsyncTaskStatusSnapshot } from '@/lib/route-run-async';
import {
  isTrustedDeliveryV1,
  type TrustedDeliveryAiOperationLogEntry,
  type TrustedDeliveryConfirmKind,
  type TrustedDeliveryDegradedExplanation,
  type TrustedDeliveryFlawedDisclosure,
  type TrustedDeliveryTaskPhase,
  type TrustedDeliveryTaskProgress,
  type TrustedDeliveryUserConfirm,
  type TrustedDeliveryV1,
} from '@/types/trusted-delivery';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

function pickStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

function normalizeTaskProgress(raw: unknown): TrustedDeliveryTaskProgress {
  const o = isRecord(raw) ? raw : {};
  const phase = (pickStr(o.phase) ?? 'unknown') as TrustedDeliveryTaskPhase;
  const label_zh =
    pickStr(o.label_zh) ??
    pickStr(o.labelZh) ??
    (phase === 'unknown' ? '处理中' : phase);
  return {
    phase,
    label_zh,
    ...(pickNum(o.percent) != null ? { percent: pickNum(o.percent) } : {}),
    ...(pickStr(o.message) ? { message: pickStr(o.message) } : {}),
  };
}

function normalizeUserConfirm(raw: unknown): TrustedDeliveryUserConfirm {
  const o = isRecord(raw) ? raw : {};
  return {
    required: pickBool(o.required) === true,
    ...(pickStr(o.kind) ? { kind: pickStr(o.kind) as TrustedDeliveryConfirmKind } : {}),
    ...(pickStr(o.summary_zh) ?? pickStr(o.summaryZh)
      ? { summary_zh: pickStr(o.summary_zh) ?? pickStr(o.summaryZh) }
      : {}),
  };
}

function normalizeDegraded(raw: unknown): TrustedDeliveryDegradedExplanation {
  const o = isRecord(raw) ? raw : {};
  return {
    present: pickBool(o.present) === true,
    ...(pickStr(o.summary_zh) ?? pickStr(o.summaryZh)
      ? { summary_zh: pickStr(o.summary_zh) ?? pickStr(o.summaryZh) }
      : {}),
    ...(pickStringArray(o.reasons_zh ?? o.reasonsZh)
      ? { reasons_zh: pickStringArray(o.reasons_zh ?? o.reasonsZh) }
      : {}),
  };
}

function normalizeFlawedDisclosure(raw: unknown): TrustedDeliveryFlawedDisclosure {
  const o = isRecord(raw) ? raw : {};
  return {
    present: pickBool(o.present) === true,
    ...(pickStr(o.headline_zh) ?? pickStr(o.headlineZh)
      ? { headline_zh: pickStr(o.headline_zh) ?? pickStr(o.headlineZh) }
      : {}),
    ...(pickStringArray(o.reason_codes ?? o.reasonCodes)
      ? { reason_codes: pickStringArray(o.reason_codes ?? o.reasonCodes) }
      : {}),
  };
}

function normalizeOpLogEntry(v: unknown): TrustedDeliveryAiOperationLogEntry | null {
  if (!isRecord(v)) return null;
  const label_zh = pickStr(v.label_zh) ?? pickStr(v.labelZh);
  if (!label_zh) return null;
  const duration_ms = pickNum(v.duration_ms) ?? pickNum(v.durationMs);
  return {
    label_zh,
    ...(pickStr(v.summary) ? { summary: pickStr(v.summary) } : {}),
    ...(duration_ms != null ? { duration_ms } : {}),
  };
}

export function normalizeTrustedDelivery(raw: unknown): TrustedDeliveryV1 | null {
  if (!isTrustedDeliveryV1(raw) && !isRecord(raw)) return null;
  if (!isRecord(raw)) return null;

  const schema =
    pickStr(raw.schemaId) ?? pickStr(raw.schema_id) ?? pickStr(raw.schema);
  if (schema != null && schema !== 'tripnara.trusted_delivery@v1') return null;

  const hasShape =
    raw.task_progress != null ||
    raw.taskProgress != null ||
    raw.user_confirm != null ||
    raw.userConfirm != null ||
    raw.degraded_explanation != null ||
    raw.degradedExplanation != null ||
    raw.flawed_disclosure != null ||
    raw.flawedDisclosure != null ||
    Array.isArray(raw.ai_operation_log) ||
    Array.isArray(raw.aiOperationLog);
  if (!hasShape && !isTrustedDeliveryV1(raw)) return null;

  const opRaw = raw.ai_operation_log ?? raw.aiOperationLog;
  const ai_operation_log = Array.isArray(opRaw)
    ? (opRaw.map(normalizeOpLogEntry).filter(Boolean) as TrustedDeliveryAiOperationLogEntry[])
    : [];

  return {
    schemaId: 'tripnara.trusted_delivery@v1',
    version: pickNum(raw.version) ?? 1,
    task_progress: normalizeTaskProgress(raw.task_progress ?? raw.taskProgress),
    user_confirm: normalizeUserConfirm(raw.user_confirm ?? raw.userConfirm),
    degraded_explanation: normalizeDegraded(
      raw.degraded_explanation ?? raw.degradedExplanation
    ),
    flawed_disclosure: normalizeFlawedDisclosure(
      raw.flawed_disclosure ?? raw.flawedDisclosure
    ),
    ai_operation_log,
  };
}

function pickRawTrustedDelivery(response: RouteAndRunResponse): unknown {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return payload?.trusted_delivery_v1 ?? payload?.trustedDeliveryV1;
}

/** result.payload.trusted_delivery_v1 — 任意 result.status 均可读 */
export function pickTrustedDeliveryFromRouteRun(
  response: RouteAndRunResponse
): TrustedDeliveryV1 | null {
  return normalizeTrustedDelivery(pickRawTrustedDelivery(response));
}

/** poll task/status：终态或中间态 data 若携带 payload.trusted_delivery_v1 */
export function pickTrustedDeliveryFromStatusSnapshot(
  snap: RouteRunAsyncTaskStatusSnapshot | Record<string, unknown>
): TrustedDeliveryV1 | null {
  const data = (snap as RouteRunAsyncTaskStatusSnapshot).data;
  if (!isRecord(data)) return null;
  const result = isRecord(data.result) ? data.result : undefined;
  const payload = isRecord(result?.payload) ? result.payload : undefined;
  const raw = payload?.trusted_delivery_v1 ?? payload?.trustedDeliveryV1;
  return normalizeTrustedDelivery(raw);
}

export function hasTrustedDeliveryDegradedUi(
  td: TrustedDeliveryV1 | null | undefined
): boolean {
  return td?.degraded_explanation?.present === true;
}

export function hasTrustedDeliveryFlawedDisclosure(
  td: TrustedDeliveryV1 | null | undefined
): boolean {
  return td?.flawed_disclosure?.present === true;
}

export function hasTrustedDeliveryOpLogUi(
  td: TrustedDeliveryV1 | null | undefined
): boolean {
  return Boolean(td?.ai_operation_log?.length);
}

export function trustedDeliveryFlawedHeadline(
  td: TrustedDeliveryV1
): string {
  return (
    td.flawed_disclosure.headline_zh?.trim() ||
    '当前行程为瑕疵草案，尚未完全验证，请确认后再定稿。'
  );
}

/**
 * 公共进度文案：只读 task_progress，不回显内部 KERNEL_* / decision_log.step。
 * SSE/poll message 可叠在 label 后。
 */
export function trustedDeliveryProgressLabel(
  td: TrustedDeliveryV1 | null | undefined,
  options?: { sseMessage?: string | null; includePercent?: boolean }
): string | undefined {
  const tp = td?.task_progress;
  if (!tp?.label_zh?.trim()) return undefined;

  const parts: string[] = [tp.label_zh.trim()];
  const detail = options?.sseMessage?.trim() || tp.message?.trim();
  if (detail && detail !== parts[0]) {
    parts.push(detail);
  }

  let label = parts.length > 1 ? `${parts[0]} · ${parts[1]}` : parts[0];

  if (options?.includePercent !== false) {
    const pct = tp.percent;
    if (typeof pct === 'number' && Number.isFinite(pct)) {
      label = `${label}（${Math.round(pct)}%）`;
    }
  }
  return label;
}

export function trustedDeliveryProgressPercent(
  td: TrustedDeliveryV1 | null | undefined
): number | undefined {
  const pct = td?.task_progress?.percent;
  if (typeof pct === 'number' && Number.isFinite(pct)) {
    return Math.min(100, Math.max(0, pct));
  }
  return undefined;
}
