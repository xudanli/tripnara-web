/**
 * TripNARA 四层预算系统 — 类型定义
 * @see docs/prd/travel-budget-four-layer-prd.md
 */

export type SpendingPersona =
  | 'experience'
  | 'quality'
  | 'frugal'
  | 'efficiency'
  | 'balanced';

export type BudgetStructureMode = 'absolute' | 'percent';

export interface BudgetAllocations {
  transportation: number;
  accommodation: number;
  experience: number;
  food: number;
  other: number;
}

export interface TripBudgetIntent {
  total: number;
  currency: string;
  dailyBudget?: number;
  source: 'user' | 'imported' | 'inferred';
  setAt: string;
}

export interface BudgetStructure {
  mode: BudgetStructureMode;
  allocations: BudgetAllocations;
  percentages?: BudgetAllocations;
  spendingPersona?: SpendingPersona;
  personaConfidence?: number;
  updatedAt: string;
}

export interface StructureVsActualRow {
  intent: number;
  estimated: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export type StructureVsActual = Record<keyof BudgetAllocations, StructureVsActualRow>;

export interface BudgetActualsSnapshot {
  totalEstimated: number;
  totalActual: number;
  currency: string;
  categoryBreakdown: BudgetAllocations;
  unpaidCount: number;
  budgetUsagePercent?: number;
}

export interface TripBudgetProfile {
  tripId: string;
  intent: TripBudgetIntent | null;
  structure: BudgetStructure | null;
  wallet?: TravelWallet | null;
  valueSummary?: TripValueSummary | null;
  actuals?: BudgetActualsSnapshot;
  structureVsActual?: Partial<StructureVsActual>;
  gateStatus?: BudgetGateStatus | null;
  updatedAt: string;
}

export interface PutTripBudgetIntentRequest {
  total: number;
  currency?: string;
  dailyBudget?: number | null;
}

export interface PutBudgetStructureRequest {
  mode: BudgetStructureMode;
  allocations?: BudgetAllocations;
  percentages?: BudgetAllocations;
}

/** POST /planning-workbench/budget/evaluate 请求体 */
export interface BudgetEvaluateRequest {
  tripId: string;
  planId?: string;
  estimatedCost?: number;
  categoryBreakdown?: {
    accommodation: number;
    transportation: number;
    food: number;
    activities: number;
    other: number;
  };
  budgetConstraint?: {
    total?: number;
    currency?: string;
    dailyBudget?: number;
  };
  /** 预览未保存草稿时可显式传入 */
  budgetIntent?: PutTripBudgetIntentRequest;
  budgetStructure?: PutBudgetStructureRequest;
}

export interface StructureOverflowError {
  code: 'STRUCTURE_OVERFLOW';
  structureTotal: number;
  newTotal: number;
}

export type PaymentRuleMode = 'split_aa' | 'one_pays' | 'by_category' | 'custom';

export interface PaymentRule {
  mode: PaymentRuleMode;
  defaultPayerId?: string | null;
  splitBase: number;
  categoryRules?: Record<string, unknown>;
}

export interface WalletMember {
  userId: string;
  displayName: string;
  role?: 'leader' | 'member';
}

export interface TravelWallet {
  tripId: string;
  paymentRule?: PaymentRule | null;
  members: WalletMember[];
  ledgerSummary?: {
    totalPaid: number;
    totalShared: number;
    unsettledCount: number;
  };
  updatedAt?: string;
}

export interface BalanceEdge {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
}

export interface WalletBalances {
  currency: string;
  edges: BalanceEdge[];
  netByUser: Record<string, number>;
}

export interface BudgetGateStatus {
  verdict?: 'ALLOW' | 'NEED_CONFIRM' | 'NEED_ADJUST' | 'REJECT';
  violationTypes?: string[];
  message?: string;
}

export interface TripValueSummary {
  byCategory: Record<
    string,
    {
      avgSatisfaction: number;
      avgAmount: number;
      valueScore: number;
      feedbackCount: number;
    }
  >;
  overallValueScore: number;
}

export interface PutPaymentRuleRequest {
  mode: PaymentRuleMode;
  splitBase: number;
  defaultPayerId?: string | null;
  categoryRules?: Record<string, unknown> | null;
}

/** ledger category = L2 结构字段名 */
export type LedgerCategory = keyof BudgetAllocations;

export interface CreateLedgerEntryRequest {
  title: string;
  category: LedgerCategory;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitAmongUserIds: string[];
}

export interface LedgerEntry {
  id: string;
  tripId: string;
  sourceType: 'itinerary_item' | 'manual';
  sourceId: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitAmongUserIds: string[];
  sharePerPerson?: number;
  settled: boolean;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerListResponse {
  items: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
}

/** 实际发生明细行（行程项 + 手动记账） */
export interface BudgetActualLineItem {
  id: string;
  name: string;
  date?: string;
  estimated?: number;
  actual?: number;
  currency: string;
  category?: string;
  source: 'itinerary' | 'ledger';
}

// ==================== 预算工作台 · compare / details ====================

export interface BudgetCompareCategoryBreakdown {
  accommodation: number;
  transportation: number;
  food: number;
  activities: number;
  other: number;
}

export interface BudgetComparePlanInput {
  planId: string;
  label: string;
  estimatedCost: number;
  categoryBreakdown: BudgetCompareCategoryBreakdown;
}

export interface BudgetCompareRequest {
  tripId: string;
  plans: BudgetComparePlanInput[];
  /** 已有 LLM 方案矩阵时传入，服务端合并 budget 到 cost 列 */
  optionComparison?: import('@/api/planning-workbench').OptionComparison;
}

export interface BudgetComparePlanResult {
  planId: string;
  label: string;
  estimatedCost: number;
  budgetUsagePercent: number;
  verdict: string;
  violationCount: number;
  topHotspot?: string | null;
}

export interface BudgetWorkbenchPriceEvidence {
  fxRate?: string;
  tickets?: string;
  carRental?: string;
  allocationSummary?: string;
  structureSummary?: string;
  updatedAt?: string;
  updatedLabel?: string;
}

/** tripnara.budget_comparison@v1 */
export interface BudgetCompareResponse {
  schemaVersion?: string;
  plans: BudgetComparePlanResult[];
  recommendedPlanId: string;
  priceEvidence?: BudgetWorkbenchPriceEvidence;
  /** 完整 OptionComparison BFF（含 options[].budget / budgetComparison） */
  optionComparison?: import('@/api/planning-workbench').OptionComparison;
}

/** GET /planning-workbench/budget/details */
export interface BudgetWorkbenchDetailsResponse {
  profile: TripBudgetProfile;
  evidence: import('@/types/trip').BudgetEvaluationEvidence[];
  optimizations: import('@/types/trip').BudgetEvaluationOptimization[];
  priceEvidence?: BudgetWorkbenchPriceEvidence;
  planId?: string;
}
