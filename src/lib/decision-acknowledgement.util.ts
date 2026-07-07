import { DecisionSemanticsApiError } from '@/api/decision-problems';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import type { DecisionAction } from '@/generated/unified-decision-contracts';
import type { DecisionTradeoffRow } from '@/types/decision-problem';

const DEFAULT_APPLY_ACKNOWLEDGEMENT =
  '我已了解该方案对行程与时间的影响，确认应用到行程';

export function isDecisionAcknowledgementRequiredError(err: unknown): boolean {
  if (err instanceof DecisionSemanticsApiError) {
    if (err.code === 'DECISION_ACKNOWLEDGEMENT_REQUIRED') return true;
    if (/DECISION_ACKNOWLEDGEMENT_REQUIRED/i.test(err.message)) return true;
  }
  if (err instanceof Error && /DECISION_ACKNOWLEDGEMENT_REQUIRED/i.test(err.message)) {
    return true;
  }
  return false;
}

export function isCausalTraceStaleError(err: unknown): boolean {
  if (err instanceof DecisionSemanticsApiError) {
    if (err.code === 'CAUSAL_TRACE_STALE') return true;
    if (/CAUSAL_TRACE_STALE/i.test(err.message)) return true;
  }
  if (err instanceof Error && /CAUSAL_TRACE_STALE/i.test(err.message)) {
    return true;
  }
  return false;
}

export function areDecisionAcknowledgementsComplete(
  required: string[],
  checked: string[],
): boolean {
  if (!required.length) return true;
  return required.every((item) => checked.includes(item));
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function acknowledgementFromTradeoffs(
  tradeoffs: DecisionTradeoffRow[] | undefined,
  options?: { worsenOnly?: boolean },
): string[] {
  if (!tradeoffs?.length) return [];
  const worsenOnly = options?.worsenOnly !== false;
  return tradeoffs
    .filter((row) => {
      if (!row.explanation?.trim()) return false;
      if (!worsenOnly) return true;
      return row.direction === 'WORSEN';
    })
    .map((row) => `我已了解：${row.explanation!.trim()}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 从 apply/resolutions 错误的 details 提取后端要求的确认项 */
export function resolveAcknowledgementRequiredFromError(err: unknown): string[] {
  if (!(err instanceof DecisionSemanticsApiError) || !err.details) return [];
  const record = asRecord(err.details);
  if (!record) return [];

  const candidates =
    record.requiredAcknowledgements ??
    record.required_acknowledgements ??
    record.acknowledgementRequired ??
    record.acknowledgement_required ??
    record.acknowledgements;

  if (!Array.isArray(candidates)) return [];
  return uniqueStrings(candidates.map((item) => String(item)));
}

export function isProblemApplyInFlight(
  detail: Pick<
    import('@/lib/unified-gateway-response.util').GatewayDecisionProblemDetailResult,
    'executionStatus' | 'resolution'
  > | null | undefined,
): boolean {
  const executionStatus = String(detail?.executionStatus ?? '').toUpperCase();
  const resolutionStatus = String(detail?.resolution?.status ?? '').toUpperCase();
  return executionStatus === 'APPLYING' || resolutionStatus === 'APPLYING';
}

function normalizeAcknowledgementStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return uniqueStrings(raw.map((item) => String(item)));
}

/** preview.requiredAcknowledgements / acknowledgementRequired（原样用于勾选与 POST body） */
export function resolvePreviewAcknowledgementRequired(
  preview: GatewayDecisionPreviewResult | null | undefined,
): string[] {
  if (!preview) return [];
  const record = preview as GatewayDecisionPreviewResult & Record<string, unknown>;
  const fromRequired = normalizeAcknowledgementStrings(
    record.requiredAcknowledgements ?? record.required_acknowledgements,
  );
  if (fromRequired.length) return fromRequired;
  return normalizeAcknowledgementStrings(preview.acknowledgementRequired);
}

/** preview.acknowledgementRequired 缺失时的兜底（仍展示可勾选项） */
export function resolveDecisionAcknowledgementRequired(input: {
  preview?: GatewayDecisionPreviewResult | null;
  action?: DecisionAction | null;
  /** apply 失败且后端要求确认时，至少展示默认确认项 */
  forceFallback?: boolean;
  /** apply 阶段展示全部 tradeoff 确认项（含 IMPROVE） */
  includeAllTradeoffs?: boolean;
  /** 后端 error.details 下发的确认项（优先） */
  serverRequired?: string[];
}): string[] {
  if (input.serverRequired?.length) {
    return uniqueStrings(input.serverRequired);
  }

  const previewLoaded = Boolean(input.preview?.optionId?.trim());
  const fromPreview = resolvePreviewAcknowledgementRequired(input.preview);
  if (fromPreview.length) return fromPreview;
  if (previewLoaded) return [];

  const record = (input.preview ?? {}) as GatewayDecisionPreviewResult & {
    impactSummary?: string;
    description?: string;
  };
  const fromTradeoffs = acknowledgementFromTradeoffs(input.preview?.tradeoffs, {
    worsenOnly: !input.includeAllTradeoffs,
  });
  if (fromTradeoffs.length) return uniqueStrings(fromTradeoffs);

  const narrative =
    record.impactSummary?.trim() ||
    record.description?.trim() ||
    input.action?.expectedImpact?.trim() ||
    input.action?.summary?.trim();
  if (narrative) {
    return [`我已了解：${narrative}`];
  }

  if (input.forceFallback) {
    return [DEFAULT_APPLY_ACKNOWLEDGEMENT];
  }

  return [];
}
