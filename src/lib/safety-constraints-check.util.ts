import type {
  SafetyConstraintCheckHint,
  SafetyConstraintCheckMeta,
} from '@/types/safety-constraints-check';
import {
  SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY,
  SAFETY_CONSTRAINT_FORMAL_AUTHORITY,
} from '@/types/safety-constraints-check';

export {
  SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY,
  SAFETY_CONSTRAINT_FORMAL_AUTHORITY,
} from '@/types/safety-constraints-check';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeHint(raw: unknown): SafetyConstraintCheckHint | null {
  const r = asRecord(raw);
  if (!r) return null;
  const message = typeof r.message === 'string' ? r.message.trim() : undefined;
  const code = typeof r.code === 'string' ? r.code.trim() : undefined;
  if (!message && !code) return null;
  return {
    code,
    message,
    severity:
      typeof r.severity === 'string'
        ? r.severity
        : typeof r.priority === 'string'
          ? r.priority
          : undefined,
    constraintId:
      typeof r.constraintId === 'string'
        ? r.constraintId
        : typeof r.constraint_id === 'string'
          ? r.constraint_id
          : undefined,
    decisionProblemId:
      typeof r.decisionProblemId === 'string'
        ? r.decisionProblemId
        : typeof r.decision_problem_id === 'string'
          ? r.decision_problem_id
          : typeof r.problemId === 'string'
            ? r.problemId
            : undefined,
  };
}

function normalizeHintList(raw: unknown): SafetyConstraintCheckHint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeHint).filter((item): item is SafetyConstraintCheckHint => item != null);
}

/** 解析 POST /training/safety/constraints/check 或 trip constraints/check 的 narrate-only 元数据 */
export function parseSafetyConstraintCheckMeta(raw: unknown): SafetyConstraintCheckMeta {
  const r = asRecord(raw);
  if (!r) return {};

  const usageRaw = r.usage ?? r.checkUsage ?? r.check_usage;
  const usage = typeof usageRaw === 'string' ? usageRaw : undefined;

  const formalAuthorityRaw = r.formal_authority ?? r.formalAuthority;
  const formal_authority =
    typeof formalAuthorityRaw === 'string' ? formalAuthorityRaw : undefined;

  return {
    usage,
    formal_authority,
    formalAuthority: formal_authority,
    is_blocked: r.is_blocked === true || r.isBlocked === true ? true : undefined,
    isBlocked: r.is_blocked === true || r.isBlocked === true ? true : undefined,
    requires_approval:
      r.requires_approval === true || r.requiresApproval === true ? true : undefined,
    requiresApproval:
      r.requires_approval === true || r.requiresApproval === true ? true : undefined,
    violations: normalizeHintList(r.violations),
    warnings: normalizeHintList(r.warnings),
  };
}

export function isNarrateOnlySafetyConstraintCheck(
  response: Pick<SafetyConstraintCheckMeta, 'usage'> | null | undefined,
): boolean {
  return response?.usage === SAFETY_CONSTRAINT_CHECK_NARRATE_ONLY;
}

export function isConstraintEvaluationGatewayCheck(
  response: Pick<SafetyConstraintCheckMeta, 'formal_authority' | 'formalAuthority'> | null | undefined,
): boolean {
  const authority = response?.formal_authority ?? response?.formalAuthority;
  return authority === SAFETY_CONSTRAINT_FORMAL_AUTHORITY;
}

/**
 * narrate_only 下 **禁止** 用 is_blocked / requires_approval 做正式门禁。
 * 正式裁决走 decision-problems → Gateway（resolutions → apply）。
 */
export function shouldUseSafetyCheckForFormalGate(
  response: SafetyConstraintCheckMeta | null | undefined,
): boolean {
  if (!response) return false;
  if (isNarrateOnlySafetyConstraintCheck(response)) return false;
  return response.is_blocked === true || response.isBlocked === true;
}

/** violations / warnings 仅作 UI 提示文案与深链，不可 disable 提交或 apply */
export function readSafetyCheckUiHints(response: SafetyConstraintCheckMeta | null | undefined): {
  violations: SafetyConstraintCheckHint[];
  warnings: SafetyConstraintCheckHint[];
} {
  return {
    violations: response?.violations ?? [],
    warnings: response?.warnings ?? [],
  };
}

export const SAFETY_CONSTRAINT_NARRATE_ONLY_HINT =
  '约束校验为 narrate-only 投影；正式裁决请走决策空间（decision-problems → Gateway）。';

export function formatSafetyCheckNarrateOnlyBanner(
  response: SafetyConstraintCheckMeta | null | undefined,
): string | null {
  if (!isNarrateOnlySafetyConstraintCheck(response)) return null;
  return SAFETY_CONSTRAINT_NARRATE_ONLY_HINT;
}
