import { isAxiosError } from 'axios';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

export const EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED = 'EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED';
export const NON_CANONICAL_APPLY_DEPRECATED = 'NON_CANONICAL_APPLY_DEPRECATED';

export interface WriteChainBlockedDetails {
  caller?: string;
  authorizedPaths?: string[];
  writeChain?: boolean;
}

export interface WriteChainBlockedErrorView {
  code: typeof EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED | typeof NON_CANONICAL_APPLY_DEPRECATED;
  message: string;
  details?: WriteChainBlockedDetails;
}

export class EffectivePlanWriteChainRequiredError extends Error {
  readonly code = EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED;
  readonly problemId?: string;
  readonly details?: WriteChainBlockedDetails;
  readonly apiMessage?: string;

  constructor(
    problemId?: string,
    message?: string,
    details?: WriteChainBlockedDetails,
    apiMessage?: string,
  ) {
    super(message ?? formatWriteChainBlockedUserMessage({ apiMessage, details }));
    this.name = 'EffectivePlanWriteChainRequiredError';
    this.problemId = problemId;
    this.details = details;
    this.apiMessage = apiMessage;
  }
}

export class NonCanonicalApplyDeprecatedError extends Error {
  readonly code = NON_CANONICAL_APPLY_DEPRECATED;
  readonly problemId?: string;
  readonly details?: WriteChainBlockedDetails;
  readonly apiMessage?: string;

  constructor(
    problemId?: string,
    message?: string,
    details?: WriteChainBlockedDetails,
    apiMessage?: string,
  ) {
    super(message ?? formatWriteChainBlockedUserMessage({ apiMessage, details, deprecated: true }));
    this.name = 'NonCanonicalApplyDeprecatedError';
    this.problemId = problemId;
    this.details = details;
    this.apiMessage = apiMessage;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeWriteChainBlockedDetails(raw: unknown): WriteChainBlockedDetails | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const authorizedPaths = Array.isArray(record.authorizedPaths)
    ? record.authorizedPaths.filter((item): item is string => typeof item === 'string')
    : undefined;
  return {
    caller: typeof record.caller === 'string' ? record.caller : undefined,
    authorizedPaths: authorizedPaths?.length ? authorizedPaths : undefined,
    writeChain: record.writeChain === true ? true : undefined,
  };
}

export function readFeasibilityRepairErrorCode(data: unknown): string | undefined {
  const record = asRecord(data);
  if (!record) return undefined;
  const err = asRecord(record.error);
  if (err) {
    if (typeof err.errorCode === 'string') return err.errorCode;
    if (typeof err.code === 'string') return err.code;
  }
  if (typeof record.errorCode === 'string') return record.errorCode;
  if (typeof record.code === 'string') return record.code;
  return undefined;
}

function readFeasibilityRepairErrorMessage(data: unknown): string | undefined {
  const record = asRecord(data);
  const err = asRecord(record?.error);
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();
  if (typeof record?.message === 'string' && record.message.trim()) return record.message.trim();
  return undefined;
}

function readFeasibilityRepairErrorDetails(data: unknown): WriteChainBlockedDetails | undefined {
  const record = asRecord(data);
  const err = asRecord(record?.error);
  return normalizeWriteChainBlockedDetails(err?.details ?? record?.details);
}

/** 解析 BFF `{ success:false, error:{ code, message, details } }` 写链阻断 */
export function parseWriteChainBlockedError(data: unknown): WriteChainBlockedErrorView | null {
  const code = readFeasibilityRepairErrorCode(data);
  if (
    code !== EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED &&
    code !== NON_CANONICAL_APPLY_DEPRECATED &&
    code !== 'WRITE_CHAIN_BLOCKED'
  ) {
    return null;
  }
  const message = readFeasibilityRepairErrorMessage(data);
  const details = readFeasibilityRepairErrorDetails(data);
  return {
    code:
      code === NON_CANONICAL_APPLY_DEPRECATED
        ? NON_CANONICAL_APPLY_DEPRECATED
        : EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
    message:
      message ??
      (code === NON_CANONICAL_APPLY_DEPRECATED
        ? 'Legacy apply 已废弃'
        : code === 'WRITE_CHAIN_BLOCKED'
          ? '计划变更需通过决策空间应用'
          : '计划变更被写链拦截'),
    details,
  };
}

export function parseWriteChainBlockedFromThrown(err: unknown): WriteChainBlockedErrorView | null {
  if (err instanceof EffectivePlanWriteChainRequiredError) {
    return {
      code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
      message: err.apiMessage ?? err.message,
      details: err.details,
    };
  }
  if (err instanceof NonCanonicalApplyDeprecatedError) {
    return {
      code: NON_CANONICAL_APPLY_DEPRECATED,
      message: err.apiMessage ?? err.message,
      details: err.details,
    };
  }
  const responseData = isAxiosError(err)
    ? err.response?.data
    : (err as { response?: { data?: unknown } })?.response?.data;
  if (responseData) {
    const fromBody = parseWriteChainBlockedError(responseData);
    if (fromBody) return fromBody;
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (
      code === EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED ||
      code === NON_CANONICAL_APPLY_DEPRECATED
    ) {
      return {
        code,
        message:
          typeof (err as { message?: string }).message === 'string'
            ? (err as { message: string }).message
            : code,
        details: normalizeWriteChainBlockedDetails((err as { details?: unknown }).details),
      };
    }
  }
  const writeChainSignal = parseWriteChainRequiredSignal(err);
  if (writeChainSignal) {
    return {
      code: EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED,
      message: writeChainSignal.message ?? '计划变更被写链拦截',
      details: {
        caller: writeChainSignal.caller,
        authorizedPaths: writeChainSignal.authorizedPaths,
        writeChain: true,
      },
    };
  }
  return null;
}

/** RLIntegration.preDecision / DAG orchestrator 结构化写链拒绝 */
export function parseWriteChainRequiredSignal(raw: unknown): {
  writeChainRequired: true;
  authorizedPaths?: string[];
  message?: string;
  caller?: string;
} | null {
  const record = asRecord(raw);
  if (!record) return null;
  const required =
    record.writeChainRequired === true || record.write_chain_required === true;
  if (!required) return null;

  const pathsRaw = record.authorizedPaths ?? record.authorized_paths;
  const authorizedPaths = Array.isArray(pathsRaw)
    ? pathsRaw.filter((item): item is string => typeof item === 'string')
    : undefined;

  const message =
    typeof record.message === 'string'
      ? record.message
      : typeof record.reason === 'string'
        ? record.reason
        : undefined;

  const caller =
    typeof record.caller === 'string'
      ? record.caller
      : typeof record.source === 'string'
        ? record.source
        : undefined;

  return {
    writeChainRequired: true,
    authorizedPaths: authorizedPaths?.length ? authorizedPaths : undefined,
    message,
    caller,
  };
}

/** 用 authorizedPaths 生成 CTA 文案（resolutions → apply） */
export function formatWriteChainAuthorizedPathsCta(paths?: string[]): string {
  if (!paths?.length) {
    return '请走决策写链：提交结论（resolutions）→ 应用到行程（apply）';
  }
  const labels = paths.map((path) => {
    if (path.includes('/resolutions')) return '提交结论（resolutions）';
    if (path.includes('/apply')) return '应用到行程（apply）';
    return path;
  });
  return `请走：${labels.join(' → ')}`;
}

export function formatWriteChainBlockedUserMessage(input: {
  apiMessage?: string;
  details?: WriteChainBlockedDetails;
  deprecated?: boolean;
}): string {
  const cta = formatWriteChainAuthorizedPathsCta(input.details?.authorizedPaths);
  if (input.deprecated) {
    return input.apiMessage?.trim()
      ? `${input.apiMessage.trim()} ${cta}`
      : `Legacy 直写已废弃（NON_CANONICAL_APPLY_DEPRECATED）。${cta}`;
  }
  return input.apiMessage?.trim()
    ? `${input.apiMessage.trim()} ${cta}`
    : `计划变更被写链拦截。${cta}`;
}

export function isNonCanonicalApplyDeprecatedError(
  err: unknown,
): err is NonCanonicalApplyDeprecatedError {
  if (err instanceof NonCanonicalApplyDeprecatedError) return true;
  const parsed = parseWriteChainBlockedFromThrown(err);
  return parsed?.code === NON_CANONICAL_APPLY_DEPRECATED;
}

export function isEffectivePlanWriteChainRequiredError(
  err: unknown,
): err is EffectivePlanWriteChainRequiredError {
  if (err instanceof EffectivePlanWriteChainRequiredError) return true;
  const parsed = parseWriteChainBlockedFromThrown(err);
  return parsed?.code === EFFECTIVE_PLAN_WRITE_CHAIN_REQUIRED;
}

export function isLegacyApplyBlockedError(err: unknown): boolean {
  return isEffectivePlanWriteChainRequiredError(err) || isNonCanonicalApplyDeprecatedError(err);
}

/** 写链阻断错误不可重试同一 apply-repair / resolveConflicts 路径 */
export function shouldRetryLegacyApply(err: unknown): boolean {
  return !isLegacyApplyBlockedError(err);
}

export function formatLegacyApplyBlockedMessage(err?: unknown): string {
  const parsed = err ? parseWriteChainBlockedFromThrown(err) : null;
  if (parsed) {
    return formatWriteChainBlockedUserMessage({
      apiMessage: parsed.message,
      details: parsed.details,
      deprecated: parsed.code === NON_CANONICAL_APPLY_DEPRECATED,
    });
  }
  if (err instanceof EffectivePlanWriteChainRequiredError) return err.message;
  if (err instanceof NonCanonicalApplyDeprecatedError) return err.message;
  return effectivePlanWriteChainRequiredMessage();
}

export function coerceWriteChainBlockedError(err: unknown): Error {
  const parsed = parseWriteChainBlockedFromThrown(err);
  if (!parsed) {
    return err instanceof Error ? err : new Error(String(err));
  }
  if (parsed.code === NON_CANONICAL_APPLY_DEPRECATED) {
    return new NonCanonicalApplyDeprecatedError(
      undefined,
      undefined,
      parsed.details,
      parsed.message,
    );
  }
  return new EffectivePlanWriteChainRequiredError(
    undefined,
    undefined,
    parsed.details,
    parsed.message,
  );
}

/** Gateway 写链开启时，产品 UI 禁止直接 feasibility apply-repair 写行程 */
export function shouldBlockDirectFeasibilityApplyRepair(): boolean {
  return shouldBlockDirectEffectivePlanWrite();
}

/** 含 apply-repair、commitPlan 等直写 Effective Plan / 时间轴 */
export function shouldBlockDirectEffectivePlanWrite(): boolean {
  return isUnifiedDecisionGatewayEnabled();
}

/** @deprecated 使用 shouldBlockDirectEffectivePlanWrite */
export function shouldBlockCommitPlanDirectWrite(): boolean {
  return shouldBlockDirectEffectivePlanWrite();
}

export function assertCommitPlanAllowed(): void {
  if (!shouldBlockCommitPlanDirectWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    undefined,
    '方案落盘需走决策写链（decision-problems → apply），不可直接 commitPlan 写时间轴',
  );
}

export function resolveFeasibilityIssueDecisionProblemId(
  issue: Pick<FeasibilityIssueDto, 'id' | 'decisionProblemId'>,
): string | undefined {
  const fromField = issue.decisionProblemId?.trim();
  if (fromField) return fromField;
  return issue.id?.trim() || undefined;
}

export function assertFeasibilityApplyRepairAllowed(
  issue: Pick<FeasibilityIssueDto, 'id' | 'decisionProblemId'>,
): void {
  if (!shouldBlockDirectFeasibilityApplyRepair()) return;
  throw new EffectivePlanWriteChainRequiredError(
    resolveFeasibilityIssueDecisionProblemId(issue),
  );
}

/** POST /conflicts/resolve — 仅 dryRun 预览；非 dryRun 写链开启时禁止直写 */
export function assertConflictsResolveAllowed(request: { dryRun?: boolean }): void {
  if (request.dryRun === true) return;
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    undefined,
    '冲突 resolve 请使用 dryRun 预览；正式落盘请走 decision-problems/:id/apply',
  );
}

/** POST /readiness/apply-repair — 写链开启时禁止 */
export function assertReadinessApplyRepairAllowed(input?: {
  blockerId?: string;
  issueId?: string;
}): void {
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    input?.blockerId ?? input?.issueId,
    'Readiness apply-repair 已禁用，请走 decision-problems → resolutions → apply',
  );
}

/** POST /execution/reorder — 写链开启时禁止直写 */
export function assertExecutionReorderAllowed(input?: { tripId?: string }): void {
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    undefined,
    'Execution reorder 已禁用，请走 decision-problems → resolutions → apply',
  );
}

/** POST /execution/apply-fallback — 写链开启时禁止直写 */
export function assertExecutionApplyFallbackAllowed(input?: {
  tripId?: string;
  solutionId?: string;
}): void {
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    undefined,
    'Execution apply-fallback 已禁用，请走 decision-problems → resolutions → apply',
  );
}

/** POST .../execution-advisory/recommendations/:id/apply — 写链开启时禁止直写 */
export function assertExecutionApplyRecommendationAllowed(input?: {
  tripId?: string;
  recommendationId?: string;
}): void {
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    undefined,
    'Execution 推荐方案应用已禁用，请走 decision-problems → resolutions → apply',
  );
}

/** trip-planner applySuggestion — 写链开启时禁止直写 */
export function assertTripPlannerApplySuggestionAllowed(input?: {
  tripId?: string;
  suggestionId?: string;
  decisionProblemId?: string;
}): void {
  if (!shouldBlockDirectEffectivePlanWrite()) return;
  throw new EffectivePlanWriteChainRequiredError(
    input?.decisionProblemId,
    'Trip-planner 建议应用已禁用，请走 decision-problems → resolutions → apply',
  );
}

export function effectivePlanWriteChainRequiredMessage(): string {
  return formatWriteChainAuthorizedPathsCta();
}
