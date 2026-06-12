/** tripnara.flawed_draft@v1 — SUCCESS 但未完全 VERIFIED 的瑕疵草案描述 */
export type FlawedDraftSchemaId = 'tripnara.flawed_draft@v1';

export type FlawedDraftReasonCode =
  | 'REPAIR_BUDGET_EXCEEDED'
  | 'GATE_ADJUST_REQUIRED'
  | 'UNRESOLVED_VERIFICATION'
  | 'VERIFY_PARTIAL'
  | 'UTILITY_DECAY_BYPASSED'
  | 'ALLOW_PARTIAL_GATE_RELAXED'
  | (string & {});

export type FlawedDraftGateStatus =
  | 'ALLOW'
  | 'ADJUST_REQUIRED'
  | 'BLOCK'
  | 'NEED_USER_CONFIRM'
  | (string & {});

export interface FlawedDraftReason {
  code: FlawedDraftReasonCode;
  detail_zh?: string;
  detail_en?: string;
}

export interface FlawedDraftDescriptorV1 {
  schemaId: FlawedDraftSchemaId;
  version: number;
  is_flawed: boolean;
  reasons: FlawedDraftReason[];
  repair_count?: number;
  max_repair_count?: number;
  gate_status?: FlawedDraftGateStatus;
  unresolved_verification_codes?: string[];
  user_action_recommended: boolean;
  headline_zh?: string;
  headline_en?: string;
  [key: string]: unknown;
}

export const FLAWED_DRAFT_REASON_SUMMARY_ZH: Record<string, string> = {
  REPAIR_BUDGET_EXCEEDED: '自动修复次数已达上限，部分冲突可能仍在',
  UTILITY_DECAY_BYPASSED: '修复后方案质量连续下降，已按您的设置仍交付草案',
  GATE_ADJUST_REQUIRED: '部分约束尚未满足，需您确认或调整',
  UNRESOLVED_VERIFICATION: '验证仍剩未消解项',
  VERIFY_PARTIAL: '门控/验证仍有关联违规摘要',
  ALLOW_PARTIAL_GATE_RELAXED: '为补全草案已临时放宽日期等硬条件',
};

export function isFlawedDraftDescriptor(v: unknown): v is FlawedDraftDescriptorV1 {
  if (typeof v !== 'object' || v == null) return false;
  const o = v as FlawedDraftDescriptorV1;
  const schema =
    typeof o.schemaId === 'string'
      ? o.schemaId
      : typeof (o as Record<string, unknown>).schema_id === 'string'
        ? ((o as Record<string, unknown>).schema_id as string)
        : typeof (o as Record<string, unknown>).schema === 'string'
          ? ((o as Record<string, unknown>).schema as string)
          : undefined;
  if (schema != null && schema !== 'tripnara.flawed_draft@v1') return false;
  return typeof o.is_flawed === 'boolean' && Array.isArray(o.reasons);
}
