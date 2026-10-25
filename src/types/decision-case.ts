/**
 * DecisionCase — 冰岛自驾等规则/机会触发的决策壳（BFF publish 后挂在 decision-problems 上）
 * @see docs/api/decision-case-backend-handoff.md
 */

export type DecisionCaseSourceKind =
  | 'REQUIRED_CHOICE'
  | 'RULE_TRIGGER'
  | 'OPPORTUNITY'
  | 'WORLD_EVENT'
  | (string & {});

export type DecisionCaseRequiredness = 'BLOCKING' | 'IMPORTANT' | 'OPTIONAL' | (string & {});

export type DecisionCaseDomain =
  | 'TRANSPORT'
  | 'INSURANCE'
  | 'ROUTE'
  | 'LODGING'
  | 'ACTIVITY'
  | 'BOOKING'
  | (string & {});

export type DecisionCaseScope = 'TRIP' | 'DAY' | 'SEGMENT' | 'ACTIVITY' | (string & {});

export type DecisionCaseActionKind = 'SELECT' | 'CONFIRM' | (string & {});

export type DecisionCaseEnrichmentStage = 'SHELL' | 'ENRICHED' | (string & {});

export type DecisionCaseWritebackTarget =
  | 'VEHICLE'
  | 'INSURANCE'
  | 'ROUTE'
  | 'LODGING'
  | 'ITINERARY'
  | 'BOOKING_INTENT'
  | (string & {});

/** API 枚举；优先用 uiGroup，文案可用 uiGroupLabelZh */
export type DecisionCaseUiGroup =
  | 'MUST_CONFIRM'
  | 'IMPORTANT_CHOICE'
  | 'WORTH_CONSIDERING'
  | (string & {});

export interface DecisionCaseMaterialityBreakdown {
  budget?: number;
  time?: number;
  safety?: number;
  fitness?: number;
  team?: number;
  bookingUrgency?: number;
  irreversibility?: number;
}

export interface DecisionCaseEligibilityCheck {
  code: string;
  passed: boolean;
  message?: string;
  dimension?: string;
  detail?: string;
}

export interface DecisionCaseEligibility {
  eligible: boolean;
  reason?: string;
  checks?: DecisionCaseEligibilityCheck[];
  softWarnings?: string[];
  eligibleOptionIds?: string[];
}

/** DecisionCase option / action 约束提示（保险涉水排除、写回载荷） */
export interface DecisionCaseConstraintHints {
  fordingExcluded?: boolean;
  writebackPayload?: Record<string, unknown>;
}

export interface DecisionCaseMeta {
  sourceKind: DecisionCaseSourceKind;
  requiredness: DecisionCaseRequiredness;
  domain?: DecisionCaseDomain;
  scope?: DecisionCaseScope;
  actionKind?: DecisionCaseActionKind;
  /** 建议 0–10；≥6 可自动 publish 体验类 */
  materialityScore?: number;
  materialityBreakdown?: DecisionCaseMaterialityBreakdown;
  enrichmentStage?: DecisionCaseEnrichmentStage;
  writebackTargets?: DecisionCaseWritebackTarget[];
  uiGroup?: DecisionCaseUiGroup;
  /** BFF 下发中文标签；缺省时 FE 用枚举映射 */
  uiGroupLabelZh?: string;
  eligibility?: DecisionCaseEligibility;
}

/** GET /decision-opportunities 列表项（未进决策空间） */
export interface DecisionOpportunitySummary {
  id: string;
  title: string;
  message?: string;
  semanticKey?: string;
  sourceKind?: DecisionCaseSourceKind;
  domain?: DecisionCaseDomain;
  materialityScore?: number;
  status?: 'OPEN' | 'DISMISSED' | 'PUBLISHED' | (string & {});
  eligibility?: DecisionCaseEligibility;
  /** eligible=false 时的简短原因（机会层） */
  ineligibilityReason?: string;
}

export interface DecisionOpportunityListResponse {
  tripId: string;
  items: DecisionOpportunitySummary[];
}
