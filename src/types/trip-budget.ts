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
