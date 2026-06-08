import type { RouteAndRunResponse, ResultStatus } from '@/api/agent';

/**
 * 与后端 failure-reason-codes 分层一致（见后端 docs/api/failure-reason-codes.md）：
 * 安全/合规 → 规则/可行性 → 槽位/澄清。前端按同一优先级解析响应内已排序的数组的首个命中分组。
 */

/** 安全 / 合规（Critical） */
export const FAILURE_CODES_CRITICAL = [
  'SECURITY_RISK',
  'POLICY_VIOLATION',
  'DRIVE_SAFETY_VIOLATED',
] as const;

/** 规则 / 可行性 —— 琥珀约束告警（与 UNSUPPORTED_CONSTRAINT 同级展示） */
export const FAILURE_CODES_CONSTRAINT_WARNING = [
  'UNSUPPORTED_CONSTRAINT',
  'PT_TRANSFER_GAP_VIOLATION',
] as const;

/**
 * 规则层兜底：FAILED 但原因未细化时使用；产品上用红色「硬拒绝」，区别于槽位澄清。
 */
export const FAILURE_CODE_VERIFICATION_UNSPECIFIED = 'VERIFICATION_FAILED_UNSPECIFIED';

/** 槽位 / 澄清（温和引导） */
export const FAILURE_CODES_CLARIFY = [
  'MISSING_DESTINATION',
  'TIME_GAP',
  /** Intake 可能在个别路径仍下发原始码，与后端映射并存 */
  'MISSING_DATES',
] as const;

export type AgentReasoningTone = 'info' | 'warning' | 'error' | 'success';

export type AgentReasoningUiMode =
  | 'CLARIFYING'
  | 'CONSTRAINT_WARNING'
  | 'REJECTED'
  /** 无阻断性问题时的中性成功路径 */
  | 'SUCCESS';

export interface AgentReasoningState {
  uiMode: AgentReasoningUiMode;
  tone: AgentReasoningTone;
  /** 为 true 时不渲染 Iron Shield（避免半成品证据吓到用户） */
  hideEvidenceCard: boolean;
  /** Iron Shield 内：用温和徽章替代 FAILED / 枚举字面（仍可在 Debug 里看 decision_log） */
  softenVerificationBadge: boolean;
  /** uiMode === CLARIFYING 且 softenVerificationBadge 时，替代默认「信息待补全」 */
  softVerificationBadgeLabel?: string;
  evidencePresentation: 'default' | 'clarifying' | 'constraint_warning' | 'critical';
  /** 气泡旁产品文案，例如「信息待补全」 */
  guidanceHint?: string;
  /** 助手气泡边框/底色语义 */
  bubbleVariant: 'default' | 'info' | 'warning' | 'error' | 'success';
  /** 合并后的原因码（explain ∪ evidence_bundle），供 Copy/Debug */
  failureCodes: string[];
}

function uniqCodes(codes: (string | undefined)[]): string[] {
  return [...new Set(codes.filter(Boolean) as string[])];
}

/** 聚合后端下发的 failure_reason_codes（explain + evidence_bundle）；后端已对合并结果排序 */
export function collectFailureReasonCodes(response: RouteAndRunResponse): string[] {
  const fromExplain = response.explain?.failure_reason_codes;
  const fromBundle = response.result?.payload?.evidence_bundle?.failure_reason_codes;
  return uniqCodes([...(fromExplain ?? []), ...(fromBundle ?? [])]);
}

function hasAny(codes: string[], candidates: readonly string[]): boolean {
  return candidates.some((c) => codes.includes(c));
}

/**
 * 将后端硬核状态映射为产品语义（槽位填充 / 约束告警 / 硬拒绝）
 */
export function getAgentReasoningState(response: RouteAndRunResponse): AgentReasoningState {
  const failureCodes = collectFailureReasonCodes(response);
  const bundle = response.result?.payload?.evidence_bundle;
  const verificationStatus = bundle?.verification_status;
  const resultStatus = response.result.status as ResultStatus;

  const sourcesUpper = Array.isArray(bundle?.sources)
    ? bundle.sources.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    : [];

  /** PARTIAL + Intake 澄清：不要走红色「验证失败」主态，保留证据卡并用温和提示 */
  const isPartialIntakeClarification =
    verificationStatus === 'PARTIAL' && sourcesUpper.includes('INTAKE_CLARIFICATION');

  if (hasAny(failureCodes, FAILURE_CODES_CRITICAL)) {
    return {
      uiMode: 'REJECTED',
      tone: 'error',
      hideEvidenceCard: false,
      softenVerificationBadge: false,
      evidencePresentation: 'critical',
      bubbleVariant: 'error',
      failureCodes,
    };
  }

  if (isPartialIntakeClarification) {
    return {
      uiMode: 'CLARIFYING',
      tone: 'info',
      hideEvidenceCard: false,
      softenVerificationBadge: true,
      softVerificationBadgeLabel: '补全信息后再生成证据',
      evidencePresentation: 'clarifying',
      guidanceHint: '补全信息后再生成证据',
      bubbleVariant: 'info',
      failureCodes,
    };
  }

  if (failureCodes.includes(FAILURE_CODE_VERIFICATION_UNSPECIFIED)) {
    return {
      uiMode: 'REJECTED',
      tone: 'error',
      hideEvidenceCard: false,
      softenVerificationBadge: false,
      evidencePresentation: 'critical',
      bubbleVariant: 'error',
      failureCodes,
    };
  }

  if (hasAny(failureCodes, FAILURE_CODES_CONSTRAINT_WARNING)) {
    return {
      uiMode: 'CONSTRAINT_WARNING',
      tone: 'warning',
      hideEvidenceCard: false,
      softenVerificationBadge: true,
      evidencePresentation: 'constraint_warning',
      guidanceHint: '部分约束与当前方案冲突',
      bubbleVariant: 'warning',
      failureCodes,
    };
  }

  if (hasAny(failureCodes, FAILURE_CODES_CLARIFY)) {
    return {
      uiMode: 'CLARIFYING',
      tone: 'info',
      hideEvidenceCard: true,
      softenVerificationBadge: true,
      evidencePresentation: 'clarifying',
      guidanceHint: '信息待补全',
      bubbleVariant: 'info',
      failureCodes,
    };
  }

  const verifiedLike =
    verificationStatus === 'VERIFIED' ||
    verificationStatus === 'PARTIALLY_VERIFIED' ||
    verificationStatus === 'PARTIAL';

  if (
    verifiedLike ||
    (!failureCodes.length && verificationStatus !== 'FAILED' && resultStatus === 'OK')
  ) {
    return {
      uiMode: 'SUCCESS',
      tone: 'success',
      hideEvidenceCard: false,
      softenVerificationBadge: false,
      evidencePresentation: 'default',
      bubbleVariant: verificationStatus === 'VERIFIED' ? 'success' : 'default',
      failureCodes,
    };
  }

  if (verificationStatus === 'FAILED' || resultStatus === 'FAILED') {
    return {
      uiMode: 'REJECTED',
      tone: 'error',
      hideEvidenceCard: false,
      softenVerificationBadge: false,
      evidencePresentation: 'critical',
      bubbleVariant: 'error',
      failureCodes,
    };
  }

  return {
    uiMode: 'SUCCESS',
    tone: 'success',
    hideEvidenceCard: false,
    softenVerificationBadge: false,
    evidencePresentation: 'default',
    bubbleVariant: 'default',
    failureCodes,
  };
}
