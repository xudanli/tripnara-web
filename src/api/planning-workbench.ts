import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 目的地信息
 */
export interface Destination {
  country?: string;      // 国家代码（如 "JP", "IS"）
  city?: string;         // 城市名称
  region?: string;       // 区域名称
}

/**
 * 预算约束
 */
export interface BudgetConstraint {
  total?: number;           // 总预算（必填，单位：CNY）
  currency?: string;        // 货币单位（默认 "CNY"）
  dailyBudget?: number;     // 日均预算（可选，自动计算或手动设置）
  categoryLimits?: {        // 分类预算限制（可选）
    accommodation?: number;
    transportation?: number;
    food?: number;
    activities?: number;
    other?: number;
  };
  alertThreshold?: number;  // 预警阈值（默认 0.8，即 80%）
  createdAt?: string;       // 创建时间
  updatedAt?: string;       // 更新时间
}

/**
 * 体力约束
 */
export interface FitnessConstraint {
  level?: 'low' | 'medium' | 'high';  // 体力水平
  maxDailyAscentM?: number;           // 最大日爬升（米）
  maxDailyDistanceKm?: number;        // 最大日距离（公里）
  restDayFrequency?: number;          // 休息日频率（每 N 天一个休息日）
}

/**
 * 住宿约束
 */
export interface AccommodationConstraint {
  level?: 'budget' | 'mid' | 'luxury';  // 住宿档位
  type?: string[];                       // 住宿类型
}

/**
 * 同伴约束
 */
export interface CompanionsConstraint {
  count?: number;      // 同伴数量
  ages?: number[];     // 同伴年龄
  specialNeeds?: string[];  // 特殊需求
}

/**
 * 约束条件
 */
export interface Constraints {
  budget?: BudgetConstraint;
  fitness?: FitnessConstraint;
  accommodation?: AccommodationConstraint;
  companions?: CompanionsConstraint;
}

/**
 * 规划上下文
 */
export interface PlanningContext {
  destination: Destination;
  days: number;            // 行程天数（必填）
  travelMode?: 'self_drive' | 'public_transit' | 'walking' | 'mixed';  // 交通模式
  mustDo?: string[];       // 必去地点/活动
  mustAvoid?: string[];    // 必避地点/活动
  constraints?: Constraints;
}

/**
 * 用户操作类型
 */
export type UserAction = 'generate' | 'compare' | 'commit' | 'adjust';

/**
 * 执行规划工作台请求
 */
export interface ExecutePlanningWorkbenchRequest {
  context: PlanningContext;
  tripId?: string;           // 行程 ID（可选，用于关联现有行程）
  existingPlanState?: any;   // 现有 PlanState（可选，用于增量更新）
  userAction?: UserAction;   // 用户操作
  /** commit：选中的骨架方案 id */
  selectedOptionId?: string;
  /** compare / commit（服务端未缓存方案集时） */
  skeletonOptions?: PlanSkeletonSet;
  /** 内部扩展（tripRunId、userId、异步进度等），一般无需传 */
  metadata?: Record<string, unknown>;
}

/**
 * 证据项
 */
export interface EvidenceItem {
  source: string;
  excerpt: string;
  relevance: string;
}

/**
 * 推荐项
 */
export interface RecommendationItem {
  action: string;
  reason: string;
  impact: string;
}

/**
 * Abu 人格决策类型
 */
export type AbuVerdict = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT';

/**
 * Dr.Dre 人格决策类型
 */
export type DrDreVerdict = 'ALLOW' | 'ADJUST' | 'NEED_CONFIRM';

/**
 * Neptune 人格决策类型
 */
export type NeptuneVerdict = 'ALLOW' | 'REPLACE' | 'NEED_CONFIRM';

/**
 * 通用人格决策类型（用于类型兼容）
 */
export type PersonaVerdict = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT' | 'ADJUST' | 'REPLACE';

/**
 * Abu 人格输出
 */
export interface AbuPersonaOutput {
  persona: 'ABU';
  icon: '🐻‍❄️';
  slogan: '我负责：这条路，真的能走吗？';
  verdict: AbuVerdict;
  explanation: string;  // 面向用户的解释（第一人称）
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
  confirmations?: string[];
}

/**
 * Dr.Dre 人格输出
 */
export interface DrDrePersonaOutput {
  persona: 'DR_DRE';
  icon: '🐕';
  slogan: '别太累，我会让每一天刚刚好。';
  verdict: DrDreVerdict;
  explanation: string;
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
  confirmations?: string[];
}

/**
 * Neptune 人格输出
 */
export interface NeptunePersonaOutput {
  persona: 'NEPTUNE';
  icon: '🦦';
  slogan: '如果行不通，我会给你一个刚刚好的替代。';
  verdict: NeptuneVerdict;
  explanation: string;
  evidence: EvidenceItem[];
  recommendations?: RecommendationItem[];
  confirmations?: string[];
}

/**
 * 三人格输出
 */
export interface PersonasOutput {
  abu: AbuPersonaOutput | null;
  drdre: DrDrePersonaOutput | null;
  neptune: NeptunePersonaOutput | null;
}

/**
 * 综合决策状态
 */
export type ConsolidatedDecisionStatus = 'ALLOW' | 'NEED_CONFIRM' | 'REJECT';

/**
 * 综合决策
 */
export interface ConsolidatedDecision {
  status: ConsolidatedDecisionStatus;
  summary: string;
  nextSteps: string[];
}

/** 健康度档位（内部能力输出，可放高级页） */
export type WorkbenchHealthBand = 'healthy' | 'warning' | 'critical';

export interface OptionComparisonEntry {
  optionId: string;
  /** 各维度 0–100 分；后端不再因 Kernel 门控改写 */
  scores?: Record<string, number>;
  /** 可能含 [Kernel Gate: ... dominant_cid=...] */
  summary?: string;
}

export type KernelGateStatus =
  | 'ALLOW'
  | 'NEED_CONFIRM'
  | 'REJECT'
  | (string & {});

export interface KernelGateL3Evidence {
  cid: string;
  detail: string;
  slack?: number;
  limit?: number;
}

export interface KernelGateOptionDelta {
  optionId: string;
  gateStatus: KernelGateStatus;
  violationCount: number;
  violationTypes: string[];
  dominantCid?: string;
  l3Evidence?: KernelGateL3Evidence[];
  guardiansAllowed?: boolean;
  expectedUtility?: number;
}

export interface KernelGateEval {
  optionDeltas?: KernelGateOptionDelta[];
  recommendedByGate?: string;
  recommendedDominantCid?: string;
  divergesFromLlmRecommendation?: boolean;
  llmRecommendedOptionId?: string;
  decisionOsAudit?: Record<string, unknown>;
}

export interface OptionComparison {
  options?: OptionComparisonEntry[];
  recommendation?: {
    optionId: string;
    reason: string;
  };
  kernelGateEval?: KernelGateEval;
}

export type {
  PlanStateKernelBridge,
  PlanStateKernelCompareGateMismatch,
  PlanStateKernelDebug,
} from '@/lib/planning-workbench-kernel-debug';

export interface SkeletonPoi {
  name?: string;
  nameEn?: string;
  category?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  [key: string]: unknown;
}

export interface PlanSkeleton {
  id: string;
  name: string;
  dayThemes?: Array<{ day: number; theme: string; description?: string }>;
  anchors?: Array<{
    day: number;
    location: string;
    activity: string;
    priority: 'anchor' | 'core' | 'optional';
  }>;
  transferDays?: Array<{ day: number; from: string; to: string; mode?: string }>;
  pois?: Array<{
    day: number;
    accommodation?: SkeletonPoi;
    restaurants?: Array<{ meal: 'breakfast' | 'lunch' | 'dinner'; poi: SkeletonPoi }>;
    attractions?: SkeletonPoi[];
  }>;
  rationale?: {
    philosophy?: string;
    tradeoffs?: string[];
    strengths?: string[];
    weaknesses?: string[];
  };
}

export interface PlanSkeletonSet {
  options: PlanSkeleton[];
  recommendation?: {
    optionId: string;
    reason: string;
  };
}

/**
 * 后端 PersonaShellOutput：`uiOutput.personas` 可为整个人格外壳（内含 personas.abu 等）。
 */
export interface PersonaShellOutput {
  personas: PersonasOutput;
  /** P1/P2 单主角表达层（默认可直接渲染，勿默认三人独白） */
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
  /** P0–P5 因果人格投影（kernel 切片；抽屉展示因果链 + 证据） */
  causalPersonaProjection?: import('@/types/causal-travel-runtime').CausalPersonaProjection;
  consolidatedDecision: ConsolidatedDecision;
  timestamp: string;
}

/**
 * UI 输出（execute / compare / adjust 等返回的 uiOutput 经 {@link normalizeWorkbenchUiOutput} 后为扁平结构）
 */
export interface UIOutput {
  personas: PersonasOutput;
  /** P1/P2 单主角表达层（来自 PersonaShellOutput 或 uiOutput 直出） */
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
  /** P0–P5 因果投影（顶层别名；与 personas.causalPersonaProjection 相同） */
  causalPersonaProjection?: import('@/types/causal-travel-runtime').CausalPersonaProjection;
  consolidatedDecision: ConsolidatedDecision;
  timestamp: string;
  /** 方案骨架（偏大，可懒加载 / 调试） */
  skeletonOptions?: PlanSkeletonSet;
  /** 多方案对比 */
  comparison?: OptionComparison;
  /** 预算 / 节奏 / 可行性 */
  health?: {
    budget: WorkbenchHealthBand;
    pace: WorkbenchHealthBand;
    feasibility: WorkbenchHealthBand;
  };
  /** 流程级待确认项 */
  confirmations?: string[];
}

/**
 * 规划状态
 */
export interface PlanState {
  plan_id: string;
  plan_version: number;
  constraints: any;
  itinerary: any;
  mobility: any;
  budget: any;
  pace: any;
  gate: any;
  evidence_refs: any[];
  decision_log_refs: any[];
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  /** 世界模型（体量大，避免主列表全量渲染） */
  world?: Record<string, unknown>;
  /** 服务端扩展桶，勿假设固定 key */
  metadata?: Record<string, unknown>;
}

/**
 * 执行规划工作台响应
 */
export interface ExecutePlanningWorkbenchResponse {
  planState: PlanState;
  uiOutput: UIOutput;
}

/**
 * 提交方案选项
 */
export interface CommitPlanOptions {
  partialCommit?: boolean;      // 是否部分提交
  commitDays?: number[];         // 要提交的天数（如果部分提交）
}

/**
 * 提交方案请求
 */
export interface CommitPlanRequest {
  tripId: string;
  options?: CommitPlanOptions;
}

/**
 * 提交方案响应
 */
export interface CommitPlanResponse {
  tripId: string;
  planId: string;
  committedAt: string;
  changes: {
    added: number;
    modified: number;
    removed: number;
  };
}

/**
 * 方案摘要（用于列表展示）
 */
export interface PlanSummary {
  planId: string;
  planVersion: number;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  createdAt: string;
  updatedAt: string;
  summary?: {
    itemCount: number;
    days: number;
    budget?: { total: number; currency: string };
    consolidatedDecision?: { status: string; summary: string };
    personas?: {
      abu?: { verdict: string };
      drdre?: { verdict: string };
      neptune?: { verdict: string };
    };
  };
}

/**
 * 当前方案信息
 */
export interface CurrentPlan {
  planId: string;
  planVersion: number;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  planState: PlanState;
  uiOutput: UIOutput;
  createdAt: string;
  updatedAt: string;
}

/**
 * 行程工作台数据
 */
export interface TripWorkbench {
  tripId: string;
  currentPlan?: CurrentPlan;
  planHistory: PlanSummary[];
  workbenchStatus: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
}

/**
 * 方案列表响应
 */
export interface TripPlansResponse {
  plans: PlanSummary[];
  total: number;
  hasMore: boolean;
}

/**
 * 方案详情
 */
export interface PlanDetail {
  planId: string;
  planVersion: number;
  tripId: string;
  status: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
  planState: PlanState;
  uiOutput: UIOutput;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * 对比方案请求
 */
export interface ComparePlansRequest {
  planIds: string[];              // 要对比的方案 ID 列表（至少 2 个）
  compareFields?: string[];      // 要对比的字段（可选）
}

/**
 * 方案差异
 */
export interface PlanDifference {
  field: string;
  plan1Value: any;
  plan2Value: any;
  impact: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * 对比摘要
 */
export interface CompareSummary {
  bestBudget?: string;
  bestRoute?: string;
  bestTime?: string;
  recommendations?: string[];
}

/**
 * 对比方案响应
 */
export interface ComparePlansResponse {
  plans: Array<{
    planId: string;
    planVersion: number;
    planState: PlanState;
    uiOutput: UIOutput;
  }>;
  differences: PlanDifference[];
  summary: CompareSummary;
}

/**
 * 调整类型
 */
export type AdjustmentType = 'add_place' | 'remove_place' | 'modify_constraint' | 'change_day' | 'modify_budget';

/**
 * 调整项
 */
export interface Adjustment {
  type: AdjustmentType;
  data: any;
}

/**
 * 调整方案请求
 */
export interface AdjustPlanRequest {
  adjustments: Adjustment[];
  regenerate?: boolean;  // 是否重新生成方案，默认 true
}

/**
 * 变更项
 */
export interface PlanChange {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * 调整方案响应
 */
export interface AdjustPlanResponse {
  newPlanId: string;
  newPlanVersion: number;
  planState: PlanState;
  uiOutput: UIOutput;
  changes: PlanChange[];
}

const FALLBACK_CONSOLIDATED_DECISION: ConsolidatedDecision = {
  status: 'NEED_CONFIRM',
  summary: '',
  nextSteps: [],
};

function readGuardianPresentation(
  record: Record<string, unknown> | null | undefined,
): import('@/types/guardian-presentation').GuardianPersonaPresentation | undefined {
  if (!record) return undefined;
  const raw = record.presentation ?? record.guardianPresentation;
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.headline !== 'string' || typeof o.narrative !== 'string') {
    return undefined;
  }
  return raw as import('@/types/guardian-presentation').GuardianPersonaPresentation;
}

function readCausalPersonaProjection(
  record: Record<string, unknown> | null | undefined,
): import('@/types/causal-travel-runtime').CausalPersonaProjection | undefined {
  if (!record) return undefined;
  const raw = record.causalPersonaProjection;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw as import('@/types/causal-travel-runtime').CausalPersonaProjection;
}

/** 从 execute/compare 原始 uiOutput 提取因果投影（兼容 shell 嵌套与顶层别名） */
export function pickCausalPersonaProjection(
  raw: unknown,
): import('@/types/causal-travel-runtime').CausalPersonaProjection | undefined {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const personasField = r.personas;
  if (isPersonaShellOutput(personasField)) {
    return (
      readCausalPersonaProjection(personasField as unknown as Record<string, unknown>) ??
      readCausalPersonaProjection(r)
    );
  }
  return (
    readCausalPersonaProjection(personasField as Record<string, unknown> | undefined) ??
    readCausalPersonaProjection(r)
  );
}

function isPersonaShellOutput(value: unknown): value is PersonaShellOutput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const inner = v.personas;
  const hasPresentation = Boolean(readGuardianPresentation(v));
  const hasConsolidated =
    v.consolidatedDecision !== undefined &&
    typeof v.consolidatedDecision === 'object';
  if (hasPresentation && hasConsolidated) return true;
  if (!inner || typeof inner !== 'object') return false;
  const innerObj = inner as Record<string, unknown>;
  const hasTriplet =
    'abu' in innerObj || 'drdre' in innerObj || 'neptune' in innerObj;
  return hasTriplet && hasConsolidated;
}

/**
 * 将后端 `uiOutput` 归一为扁平结构（兼容 `personas` 为 {@link PersonaShellOutput} 的嵌套形态）。
 */
export function normalizeWorkbenchUiOutput(raw: unknown): UIOutput {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const personasField = r.personas;

  let personas: PersonasOutput;
  let consolidatedDecision: ConsolidatedDecision;
  let timestamp: string;
  let presentation:
    | import('@/types/guardian-presentation').GuardianPersonaPresentation
    | undefined;
  let causalPersonaProjection:
    | import('@/types/causal-travel-runtime').CausalPersonaProjection
    | undefined;

  if (isPersonaShellOutput(personasField)) {
    const shell = personasField;
    personas = shell.personas ?? { abu: null, drdre: null, neptune: null };
    consolidatedDecision =
      shell.consolidatedDecision ?? FALLBACK_CONSOLIDATED_DECISION;
    timestamp =
      typeof shell.timestamp === 'string' && shell.timestamp.length > 0
        ? shell.timestamp
        : new Date().toISOString();
    presentation = readGuardianPresentation(
      shell as unknown as Record<string, unknown>,
    );
    causalPersonaProjection =
      readCausalPersonaProjection(shell as unknown as Record<string, unknown>) ??
      readCausalPersonaProjection(r);
  } else {
    personas =
      (personasField as PersonasOutput | undefined) ?? {
        abu: null,
        drdre: null,
        neptune: null,
      };
    consolidatedDecision =
      (r.consolidatedDecision as ConsolidatedDecision | undefined) ??
      FALLBACK_CONSOLIDATED_DECISION;
    timestamp =
      typeof r.timestamp === 'string' && r.timestamp.length > 0
        ? r.timestamp
        : new Date().toISOString();
    presentation =
      readGuardianPresentation(
        personasField as Record<string, unknown> | undefined,
      ) ?? readGuardianPresentation(r);
    causalPersonaProjection =
      readCausalPersonaProjection(personasField as Record<string, unknown> | undefined) ??
      readCausalPersonaProjection(r);
  }

  return {
    personas,
    presentation,
    causalPersonaProjection,
    consolidatedDecision,
    timestamp,
    skeletonOptions: r.skeletonOptions as PlanSkeletonSet | undefined,
    comparison: normalizeOptionComparison(r.comparison),
    health: r.health as UIOutput['health'],
    confirmations: Array.isArray(r.confirmations)
      ? (r.confirmations as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeKernelGateEval(raw: unknown): KernelGateEval | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const deltasRaw = o.optionDeltas ?? o.option_deltas;
  const optionDeltas = Array.isArray(deltasRaw)
    ? deltasRaw
        .map((item) => {
          const d = asRecord(item);
          if (!d) return null;
          const optionId = d.optionId ?? d.option_id;
          const gateStatus = d.gateStatus ?? d.gate_status;
          if (typeof optionId !== 'string' || typeof gateStatus !== 'string') return null;

          const l3Raw = d.l3Evidence ?? d.l3_evidence;
          const l3Evidence = Array.isArray(l3Raw)
            ? l3Raw
                .map((ev) => {
                  const e = asRecord(ev);
                  if (!e) return null;
                  const cid = e.cid;
                  const detail = e.detail;
                  if (typeof cid !== 'string' || typeof detail !== 'string') return null;
                  return {
                    cid,
                    detail,
                    ...(typeof e.slack === 'number' ? { slack: e.slack } : {}),
                    ...(typeof e.limit === 'number' ? { limit: e.limit } : {}),
                  } satisfies KernelGateL3Evidence;
                })
                .filter((x): x is KernelGateL3Evidence => x != null)
            : undefined;

          return {
            optionId,
            gateStatus: gateStatus as KernelGateStatus,
            violationCount: Number(d.violationCount ?? d.violation_count ?? 0),
            violationTypes: Array.isArray(d.violationTypes ?? d.violation_types)
              ? (d.violationTypes ?? d.violation_types).filter(
                  (x: unknown): x is string => typeof x === 'string',
                )
              : [],
            ...(typeof d.dominantCid === 'string' || typeof d.dominant_cid === 'string'
              ? { dominantCid: String(d.dominantCid ?? d.dominant_cid) }
              : {}),
            ...(l3Evidence?.length ? { l3Evidence } : {}),
            ...(typeof d.guardiansAllowed === 'boolean' || typeof d.guardians_allowed === 'boolean'
              ? { guardiansAllowed: Boolean(d.guardiansAllowed ?? d.guardians_allowed) }
              : {}),
            ...(typeof d.expectedUtility === 'number' || typeof d.expected_utility === 'number'
              ? { expectedUtility: Number(d.expectedUtility ?? d.expected_utility) }
              : {}),
          } satisfies KernelGateOptionDelta;
        })
        .filter((x): x is KernelGateOptionDelta => x != null)
    : undefined;

  const evalOut: KernelGateEval = {};
  if (optionDeltas?.length) evalOut.optionDeltas = optionDeltas;

  const recommendedByGate = o.recommendedByGate ?? o.recommended_by_gate;
  if (typeof recommendedByGate === 'string') evalOut.recommendedByGate = recommendedByGate;

  const recommendedDominantCid = o.recommendedDominantCid ?? o.recommended_dominant_cid;
  if (typeof recommendedDominantCid === 'string') {
    evalOut.recommendedDominantCid = recommendedDominantCid;
  }

  if (typeof o.divergesFromLlmRecommendation === 'boolean') {
    evalOut.divergesFromLlmRecommendation = o.divergesFromLlmRecommendation;
  } else if (typeof o.diverges_from_llm_recommendation === 'boolean') {
    evalOut.divergesFromLlmRecommendation = o.diverges_from_llm_recommendation;
  }

  const llmRecommendedOptionId = o.llmRecommendedOptionId ?? o.llm_recommended_option_id;
  if (typeof llmRecommendedOptionId === 'string') {
    evalOut.llmRecommendedOptionId = llmRecommendedOptionId;
  }

  const decisionOsAudit = o.decisionOsAudit ?? o.decision_os_audit;
  if (decisionOsAudit && typeof decisionOsAudit === 'object') {
    evalOut.decisionOsAudit = decisionOsAudit as Record<string, unknown>;
  }

  return Object.keys(evalOut).length > 0 ? evalOut : undefined;
}

export function normalizeOptionComparison(raw: unknown): OptionComparison | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;

  const optionsRaw = o.options;
  const options = Array.isArray(optionsRaw)
    ? optionsRaw
        .map((item) => {
          const entry = asRecord(item);
          if (!entry) return null;
          const optionId = entry.optionId ?? entry.option_id;
          if (typeof optionId !== 'string') return null;
          const scoresRaw = asRecord(entry.scores);
          const scores = scoresRaw
            ? Object.fromEntries(
                Object.entries(scoresRaw)
                  .map(([k, v]) => [k, Number(v)])
                  .filter(([, v]) => Number.isFinite(v)),
              )
            : undefined;
          const summary = entry.summary;
          return {
            optionId,
            ...(scores && Object.keys(scores).length ? { scores } : {}),
            ...(typeof summary === 'string' ? { summary } : {}),
          } satisfies OptionComparisonEntry;
        })
        .filter((x): x is OptionComparisonEntry => x != null)
    : undefined;

  const recRaw = asRecord(o.recommendation);
  const recommendation =
    recRaw &&
    typeof (recRaw.optionId ?? recRaw.option_id) === 'string' &&
    typeof recRaw.reason === 'string'
      ? {
          optionId: String(recRaw.optionId ?? recRaw.option_id),
          reason: recRaw.reason,
        }
      : undefined;

  const kernelGateEval = normalizeKernelGateEval(o.kernelGateEval ?? o.kernel_gate_eval);

  const out: OptionComparison = {};
  if (options?.length) out.options = options;
  if (recommendation) out.recommendation = recommendation;
  if (kernelGateEval) out.kernelGateEval = kernelGateEval;

  return Object.keys(out).length > 0 ? out : undefined;
}

/** 从 uiOutput 或 planState.metadata 提取多方案对比（compare / generate 共用） */
export function pickWorkbenchOptionComparison(
  sources: Array<{ uiOutput?: UIOutput; planState?: PlanState }>,
): OptionComparison | undefined {
  for (const s of sources) {
    const cmp = s.uiOutput?.comparison;
    if (cmp && (cmp.options?.length || cmp.recommendation || cmp.kernelGateEval)) {
      return cmp;
    }
  }
  for (const s of sources) {
    const meta = asRecord(s.planState?.metadata);
    if (!meta) continue;
    const cmp = normalizeOptionComparison(meta.comparison);
    if (cmp) return cmp;
  }
  return undefined;
}

export type { PlanStateKernelDebug } from '@/lib/planning-workbench-kernel-debug';
export { pickPlanStateKernelDebug } from '@/lib/planning-workbench-kernel-debug';

export function normalizeExecutePlanningWorkbenchResponse(
  res: ExecutePlanningWorkbenchResponse
): ExecutePlanningWorkbenchResponse {
  return {
    planState: res.planState,
    uiOutput: normalizeWorkbenchUiOutput(res.uiOutput),
  };
}

/** 合并流程级、门控与人格侧的待确认文案（去重保序） */
export function mergeWorkbenchConfirmations(
  result: Pick<ExecutePlanningWorkbenchResponse, 'planState' | 'uiOutput'>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const pushOne = (s?: string) => {
    const t = s?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  const pushMany = (xs?: string[]) => xs?.forEach(pushOne);

  pushMany(result.uiOutput.confirmations);
  const gate = result.planState?.gate as { requiredUserConfirmations?: string[] } | undefined;
  pushMany(gate?.requiredUserConfirmations);

  pushMany(result.uiOutput.personas.abu?.confirmations);
  pushMany(result.uiOutput.personas.drdre?.confirmations);
  pushMany(result.uiOutput.personas.neptune?.confirmations);

  return out;
}

function normalizePlanDetail(raw: PlanDetail): PlanDetail {
  return {
    ...raw,
    uiOutput: normalizeWorkbenchUiOutput(raw.uiOutput),
  };
}

function normalizeTripWorkbench(raw: TripWorkbench): TripWorkbench {
  if (!raw.currentPlan) return raw;
  return {
    ...raw,
    currentPlan: {
      ...raw.currentPlan,
      uiOutput: normalizeWorkbenchUiOutput(raw.currentPlan.uiOutput),
    },
  };
}

function normalizeComparePlansResponse(raw: ComparePlansResponse): ComparePlansResponse {
  return {
    ...raw,
    plans: raw.plans.map((p) => ({
      ...p,
      uiOutput: normalizeWorkbenchUiOutput(p.uiOutput),
    })),
  };
}

/**
 * 成功响应包装
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

// ==================== 准备度入口类型定义 ====================

/**
 * 准备度发现项
 */
export interface ReadinessFindingItem {
  id?: string;
  message: string;
  category?: string;
  tasks?: string[];
  evidence?: string;
}

/**
 * 准备度发现
 */
export interface ReadinessFinding {
  destinationId: string;
  packId: string;
  blockers: ReadinessFindingItem[];
  must: ReadinessFindingItem[];
  should: ReadinessFindingItem[];
  optional: ReadinessFindingItem[];
}

/**
 * 准备度汇总
 */
export interface ReadinessSummary {
  totalBlockers: number;
  totalMust: number;
  totalShould: number;
  totalOptional: number;
}

/**
 * 准备度快捷链接
 */
export interface ReadinessQuickLinks {
  personalizedChecklist: string;
  riskWarnings: string;
  readinessScore: string;
  coverageMap: string;
}

/**
 * 行程准备度响应
 */
export interface TripReadinessResponse {
  findings: ReadinessFinding[];
  summary: ReadinessSummary;
  readinessUrl: string;
  quickLinks: ReadinessQuickLinks;
}

/**
 * 行程准备度分数链接响应
 */
export interface TripReadinessScoreLinksResponse {
  message: string;
  readinessScoreUrl: string;
  readinessChecklistUrl: string;
  readinessRiskWarningsUrl: string;
  readinessCoverageMapUrl: string;
}

/**
 * 天气数据获取结果项
 */
export interface WeatherFetchResultItem {
  placeId: number;
  placeName: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  weatherData?: {
    temperature: number;
    condition: string;
    source: string;
  };
}

/**
 * 天气数据获取响应
 */
export interface FetchWeatherResponse {
  totalPlaces: number;
  processedPlaces: number;
  successCount: number;
  failedCount: number;
  results: WeatherFetchResultItem[];
}

/**
 * 证据类型
 */
export type EvidenceType = 'weather' | 'road_closure' | 'opening_hours';

/**
 * 证据数据获取结果项
 */
export interface EvidenceFetchResultItem {
  placeId: number;
  placeName: string;
  evidenceTypes: EvidenceType[];
  status: 'success' | 'partial' | 'failed';
  errors?: Record<string, string>; // 错误信息，key 为证据类型
  fetched?: {
    weather?: {
      temperature: number;
      condition: string;
      source: string;
    };
    road_closure?: {
      isOpen: boolean;
      riskLevel: number;
      source: string;
    };
    opening_hours?: {
      hours: string;
      isOpen: boolean;
      source: string;
    };
  };
}

/**
 * 证据数据获取响应
 */
export interface FetchEvidenceResponse {
  totalPlaces: number;
  processedPlaces: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  requestedEvidenceTypes: EvidenceType[];
  results: EvidenceFetchResultItem[];
}

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    console.error('[Planning Workbench API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Planning Workbench API] API 返回错误:', {
      code: errorCode,
      message: errorMessage,
      fullError: errorData,
      fullResponse: response.data,
    });
    
    throw new Error(errorMessage);
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const planningWorkbenchApi = {
  /**
   * 执行规划工作台流程
   * POST /api/planning-workbench/execute
   * 
   * 规划工作台的主入口，支持生成方案、对比方案、提交方案、调整方案等操作。
   */
  execute: async (
    data: ExecutePlanningWorkbenchRequest
  ): Promise<ExecutePlanningWorkbenchResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 execute 请求:', {
        context: data.context,
        tripId: data.tripId,
        userAction: data.userAction,
      });

      // 规划工作台 API 可能需要更长的处理时间（LLM 调用、方案生成等）
      // 根据操作类型设置不同的超时时间
      const timeout = data.userAction === 'generate' ? 120000 : 60000; // 生成方案 120 秒，其他操作 60 秒
      const response = await apiClient.post<ApiResponseWrapper<ExecutePlanningWorkbenchResponse>>(
        '/planning-workbench/execute',
        data,
        {
          timeout,
        }
      );

      // 详细记录响应结构，便于调试
      console.log('[Planning Workbench API] 收到 execute 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        responseKeys: response.data ? Object.keys(response.data) : [],
      });

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      const normalized = normalizeExecutePlanningWorkbenchResponse(wrappedResponse);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: normalized.planState?.plan_id,
        planVersion: normalized.planState?.plan_version,
        status: normalized.planState?.status,
        personas: {
          abu: normalized.uiOutput?.personas?.abu?.verdict,
          drdre: normalized.uiOutput?.personas?.drdre?.verdict,
          neptune: normalized.uiOutput?.personas?.neptune?.verdict,
        },
        consolidatedDecision: normalized.uiOutput?.consolidatedDecision?.status,
      });

      return normalized;
    } catch (error: any) {
      console.error('[Planning Workbench API] execute 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          context: data.context,
          tripId: data.tripId,
          userAction: data.userAction,
        },
      });

      // 确保 Axios 错误消息能够正确传播
      if (error.message) {
        throw error;
      }
      // 如果没有消息，创建一个友好的错误消息
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，规划工作台处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '规划工作台请求失败，请稍后重试');
      }
    }
  },

  /**
   * 获取规划状态
   * GET /api/planning-workbench/state/:planId
   * 
   * 根据 planId 获取当前的 PlanState（待实现）。
   */
  getState: async (planId: string): Promise<PlanState> => {
    try {
      console.log('[Planning Workbench API] 发送 getState 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<PlanState>>(
        `/planning-workbench/state/${planId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getState 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.plan_id,
        planVersion: wrappedResponse.plan_version,
        status: wrappedResponse.status,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getState 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取规划状态失败，请稍后重试');
      }
    }
  },

  /**
   * 提交方案到行程
   * POST /api/planning-workbench/plans/:planId/commit
   * 
   * 将规划方案提交并保存到行程。
   */
  commitPlan: async (
    planId: string,
    data: CommitPlanRequest
  ): Promise<CommitPlanResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 commitPlan 请求:', {
        planId,
        tripId: data.tripId,
        options: data.options,
      });

      const response = await apiClient.post<ApiResponseWrapper<CommitPlanResponse>>(
        `/planning-workbench/plans/${planId}/commit`,
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 commitPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        tripId: wrappedResponse.tripId,
        planId: wrappedResponse.planId,
        committedAt: wrappedResponse.committedAt,
        changes: wrappedResponse.changes,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] commitPlan 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '提交方案失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定行程的规划工作台数据
   * GET /api/planning-workbench/trips/:tripId
   * 
   * 获取工作台数据，包括当前方案和方案历史列表。
   */
  getTripWorkbench: async (tripId: string): Promise<TripWorkbench> => {
    try {
      console.log('[Planning Workbench API] 发送 getTripWorkbench 请求:', {
        tripId,
      });

      const response = await apiClient.get<ApiResponseWrapper<TripWorkbench>>(
        `/planning-workbench/trips/${tripId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getTripWorkbench 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        tripId: wrappedResponse.tripId,
        hasCurrentPlan: !!wrappedResponse.currentPlan,
        planHistoryCount: wrappedResponse.planHistory.length,
        workbenchStatus: wrappedResponse.workbenchStatus,
      });

      return normalizeTripWorkbench(wrappedResponse);
    } catch (error: any) {
      console.error('[Planning Workbench API] getTripWorkbench 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取工作台数据失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定行程的所有规划方案列表
   * GET /api/planning-workbench/trips/:tripId/plans
   * 
   * 获取方案列表，支持状态筛选和分页。
   */
  getTripPlans: async (
    tripId: string,
    params?: {
      status?: 'DRAFT' | 'PROPOSED' | 'NEED_CONFIRM' | 'LOCKED';
      limit?: number;
      offset?: number;
    }
  ): Promise<TripPlansResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getTripPlans 请求:', {
        tripId,
        params,
      });

      const response = await apiClient.get<ApiResponseWrapper<TripPlansResponse>>(
        `/planning-workbench/trips/${tripId}/plans`,
        {
          params,
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getTripPlans 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        plansCount: wrappedResponse.plans.length,
        total: wrappedResponse.total,
        hasMore: wrappedResponse.hasMore,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getTripPlans 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        tripId,
        params,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取方案列表失败，请稍后重试');
      }
    }
  },

  /**
   * 获取指定方案的详细信息
   * GET /api/planning-workbench/plans/:planId
   * 
   * 获取方案的完整信息，包括 planState 和 uiOutput。
   */
  getPlan: async (planId: string): Promise<PlanDetail> => {
    try {
      console.log('[Planning Workbench API] 发送 getPlan 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<PlanDetail>>(
        `/planning-workbench/plans/${planId}`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        planVersion: wrappedResponse.planVersion,
        tripId: wrappedResponse.tripId,
        status: wrappedResponse.status,
      });

      return normalizePlanDetail(wrappedResponse);
    } catch (error: any) {
      console.error('[Planning Workbench API] getPlan 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取方案详情失败，请稍后重试');
      }
    }
  },

  /**
   * 对比多个规划方案
   * POST /api/planning-workbench/plans/compare
   * 
   * 对比多个方案，生成差异列表和摘要。
   */
  comparePlans: async (data: ComparePlansRequest): Promise<ComparePlansResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 comparePlans 请求:', {
        planIds: data.planIds,
        compareFields: data.compareFields,
      });

      const response = await apiClient.post<ApiResponseWrapper<ComparePlansResponse>>(
        '/planning-workbench/plans/compare',
        data,
        {
          timeout: 60000, // 60 秒超时（对比可能需要较长时间）
        }
      );

      console.log('[Planning Workbench API] 收到 comparePlans 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        plansCount: wrappedResponse.plans.length,
        differencesCount: wrappedResponse.differences.length,
        hasSummary: !!wrappedResponse.summary,
      });

      return normalizeComparePlansResponse(wrappedResponse);
    } catch (error: any) {
      console.error('[Planning Workbench API] comparePlans 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planIds: data.planIds,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，对比处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '对比方案失败，请稍后重试');
      }
    }
  },

  /**
   * 基于现有方案进行调整
   * POST /api/planning-workbench/plans/:planId/adjust
   * 
   * 调整方案并可选地重新生成。
   */
  adjustPlan: async (
    planId: string,
    data: AdjustPlanRequest
  ): Promise<AdjustPlanResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 adjustPlan 请求:', {
        planId,
        adjustments: data.adjustments,
        regenerate: data.regenerate,
      });

      const response = await apiClient.post<ApiResponseWrapper<AdjustPlanResponse>>(
        `/planning-workbench/plans/${planId}/adjust`,
        data,
        {
          timeout: 60000, // 60 秒超时（调整可能需要重新生成）
        }
      );

      console.log('[Planning Workbench API] 收到 adjustPlan 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        newPlanId: wrappedResponse.newPlanId,
        newPlanVersion: wrappedResponse.newPlanVersion,
        changesCount: wrappedResponse.changes.length,
      });

      return {
        ...wrappedResponse,
        uiOutput: normalizeWorkbenchUiOutput(wrappedResponse.uiOutput),
      };
    } catch (error: any) {
      console.error('[Planning Workbench API] adjustPlan 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
        adjustments: data.adjustments,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，调整处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '调整方案失败，请稍后重试');
      }
    }
  },

  /**
   * 预算合理性评估（Should-Exist Gate）
   * POST /planning-workbench/budget/evaluate
   */
  evaluateBudget: async (
    data: {
      planId: string;
      tripId: string;
      estimatedCost: number;
      categoryBreakdown: {
        accommodation: number;
        transportation: number;
        food: number;
        activities: number;
        other: number;
      };
      budgetConstraint: BudgetConstraint;
    }
  ): Promise<import('@/types/trip').BudgetEvaluationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 evaluateBudget 请求:', {
        planId: data.planId,
        tripId: data.tripId,
        estimatedCost: data.estimatedCost,
      });

      const response = await apiClient.post<ApiResponseWrapper<import('@/types/trip').BudgetEvaluationResponse>>(
        '/planning-workbench/budget/evaluate',
        data,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 evaluateBudget 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        verdict: wrappedResponse.verdict,
        confidence: wrappedResponse.confidence,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] evaluateBudget 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId: data.planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '预算评估失败，请稍后重试');
      }
    }
  },

  /**
   * 获取预算决策日志
   * GET /planning-workbench/budget/decision-log
   */
  getBudgetDecisionLog: async (
    planId: string,
    tripId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<import('@/types/trip').BudgetDecisionLogResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getBudgetDecisionLog 请求:', {
        planId,
        tripId,
        params,
      });

      const response = await apiClient.get<ApiResponseWrapper<import('@/types/trip').BudgetDecisionLogResponse>>(
        '/planning-workbench/budget/decision-log',
        {
          params: {
            planId,
            tripId,
            ...(params?.limit !== undefined && { limit: params.limit }),
            ...(params?.offset !== undefined && { offset: params.offset }),
          },
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getBudgetDecisionLog 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        total: wrappedResponse.total,
        itemsCount: wrappedResponse.items.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] getBudgetDecisionLog 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId,
        tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取预算决策日志失败，请稍后重试');
      }
    }
  },

  /**
   * 应用预算优化建议
   * POST /planning-workbench/budget/apply-optimization
   */
  applyBudgetOptimization: async (
    data: import('@/types/trip').ApplyBudgetOptimizationRequest
  ): Promise<import('@/types/trip').ApplyBudgetOptimizationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 applyBudgetOptimization 请求:', {
        planId: data.planId,
        tripId: data.tripId,
        optimizationIds: data.optimizationIds,
        autoCommit: data.autoCommit,
      });

      const response = await apiClient.post<ApiResponseWrapper<import('@/types/trip').ApplyBudgetOptimizationResponse>>(
        '/planning-workbench/budget/apply-optimization',
        data,
        {
          timeout: 60000, // 60 秒超时（优化可能需要较长时间）
        }
      );

      console.log('[Planning Workbench API] 收到 applyBudgetOptimization 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        newPlanId: wrappedResponse.newPlanId,
        totalSavings: wrappedResponse.totalSavings,
        newEstimatedCost: wrappedResponse.newEstimatedCost,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] applyBudgetOptimization 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        planId: data.planId,
        tripId: data.tripId,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，优化处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '应用预算优化失败，请稍后重试');
      }
    }
  },

  /**
   * 获取规划方案预算评估结果
   * GET /planning-workbench/plans/:planId/budget-evaluation
   */
  getPlanBudgetEvaluation: async (
    planId: string
  ): Promise<import('@/types/trip').PlanBudgetEvaluationResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 getPlanBudgetEvaluation 请求:', {
        planId,
      });

      const response = await apiClient.get<ApiResponseWrapper<import('@/types/trip').PlanBudgetEvaluationResponse>>(
        `/planning-workbench/plans/${planId}/budget-evaluation`,
        {
          timeout: 30000, // 30 秒超时
        }
      );

      console.log('[Planning Workbench API] 收到 getPlanBudgetEvaluation 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
      });

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] 解析后的响应:', {
        planId: wrappedResponse.planId,
        verdict: wrappedResponse.budgetEvaluation.verdict,
        personaOutput: wrappedResponse.personaOutput?.persona,
      });

      return wrappedResponse;
    } catch (error: any) {
      // 区分不同类型的错误
      const errorMessage = error?.message || '';
      const isNotFoundError = 
        errorMessage.includes('未找到') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('不存在') ||
        error?.code === 'NOT_FOUND' ||
        error?.response?.status === 404;
      
      if (isNotFoundError) {
        // "未找到"错误使用调试级别，因为预算评估是可选的
        // 只在开发环境显示详细日志
        if (import.meta.env.DEV) {
          console.debug('[Planning Workbench API] 🔍 预算评估结果不存在（方案可能尚未进行预算评估）:', {
            planId,
            message: errorMessage,
          });
        }
      } else {
        // 其他错误使用错误级别
        console.error('[Planning Workbench API] ❌ getPlanBudgetEvaluation 请求失败:', {
          error,
          message: errorMessage,
          code: error.code,
          response: error.response?.data,
          planId,
        });
      }

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '获取预算评估结果失败，请稍后重试');
      }
    }
  },

  // ==================== 准备度入口 API ====================

  /**
   * 获取行程准备度检查结果
   * GET /api/planning-workbench/trips/:tripId/readiness
   * 
   * 从规划工作台获取指定行程的准备度检查结果
   */
  getTripReadiness: async (tripId: string, lang?: 'en' | 'zh'): Promise<TripReadinessResponse> => {
    try {
      const params = lang ? { lang } : {};
      const response = await apiClient.get<ApiResponseWrapper<TripReadinessResponse>>(
        `/planning-workbench/trips/${tripId}/readiness`,
        { params }
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ getTripReadiness 请求失败:', {
        error,
        tripId,
        lang,
      });
      throw error;
    }
  },

  /**
   * 获取行程准备度分数链接
   * GET /api/planning-workbench/trips/:tripId/readiness/score
   * 
   * 获取准备度分数相关的 API 链接
   */
  getTripReadinessScoreLinks: async (tripId: string): Promise<TripReadinessScoreLinksResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<TripReadinessScoreLinksResponse>>(
        `/planning-workbench/trips/${tripId}/readiness/score`
      );
      return handleResponse(response);
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ getTripReadinessScoreLinks 请求失败:', {
        error,
        tripId,
      });
      throw error;
    }
  },

  // ==================== 证据数据获取 API ====================

  /**
   * 批量获取行程地点的所有类型证据数据（推荐）
   * POST /api/planning-workbench/trips/:tripId/fetch-evidence
   * 
   * 为指定行程的地点批量获取所有类型的证据数据（天气、道路封闭、开放时间），
   * 证据数据会自动更新到 Place 的 metadata 中
   * 
   * 🆕 P1功能：支持异步模式（async=true）
   * - 同步模式：直接返回结果（默认）
   * - 异步模式：返回任务ID，需要通过 getTaskProgress 查询进度
   * 
   * @param tripId 行程 ID
   * @param options 选项
   * @param options.placeIds 指定要获取证据的地点 ID 列表，不提供则处理所有缺少证据的地点
   * @param options.evidenceTypes 要获取的证据类型，不提供则获取所有类型
   * @param options.forceRefresh 是否强制刷新已有证据数据，默认为 false
   * @param options.async 是否异步执行，默认为 false
   */
  fetchEvidence: async (
    tripId: string,
    options?: {
      placeIds?: number[];
      evidenceTypes?: EvidenceType[];
      forceRefresh?: boolean;
      async?: boolean; // 🆕 异步模式
    }
  ): Promise<FetchEvidenceResponse | { taskId: string }> => {
    try {
      console.log('[Planning Workbench API] 发送 fetchEvidence 请求:', {
        tripId,
        options,
      });

      const params: Record<string, string> = {};
      if (options?.placeIds && options.placeIds.length > 0) {
        params.placeIds = options.placeIds.join(',');
      }
      if (options?.evidenceTypes && options.evidenceTypes.length > 0) {
        params.evidenceTypes = options.evidenceTypes.join(',');
      }
      if (options?.forceRefresh) {
        params.forceRefresh = 'true';
      }
      // 🆕 异步模式
      if (options?.async) {
        params.async = 'true';
      }
      
      const response = await apiClient.post<ApiResponseWrapper<FetchEvidenceResponse | { taskId: string }>>(
        `/planning-workbench/trips/${tripId}/fetch-evidence`,
        {},
        { 
          params,
          timeout: options?.async ? 10000 : 60000, // 异步模式10秒超时，同步模式60秒
        }
      );

      const wrappedResponse = handleResponse(response);
      
      // 🆕 如果是异步模式，返回任务ID
      if (options?.async && 'taskId' in wrappedResponse) {
        console.log('[Planning Workbench API] ✅ fetchEvidence 异步任务已创建:', {
          taskId: wrappedResponse.taskId,
        });
        return wrappedResponse;
      }
      
      // 同步模式，返回完整结果
      const syncResponse = wrappedResponse as FetchEvidenceResponse;
      console.log('[Planning Workbench API] ✅ fetchEvidence 成功:', {
        totalPlaces: syncResponse.totalPlaces,
        processedPlaces: syncResponse.processedPlaces,
        successCount: syncResponse.successCount,
        partialCount: syncResponse.partialCount,
        failedCount: syncResponse.failedCount,
        requestedEvidenceTypes: syncResponse.requestedEvidenceTypes,
      });

      return syncResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ fetchEvidence 请求失败:', {
        error,
        tripId,
        options,
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * 批量获取行程地点的天气数据
   * POST /api/planning-workbench/trips/:tripId/fetch-weather
   * 
   * 为指定行程的地点批量获取天气数据，天气数据会自动更新到 Place 的 metadata 中
   * 
   * @deprecated 推荐使用 fetchEvidence 接口，可以一次性获取所有类型的证据数据
   */
  fetchWeather: async (
    tripId: string,
    options?: {
      placeIds?: number[];
      forceRefresh?: boolean;
    }
  ): Promise<FetchWeatherResponse> => {
    try {
      console.log('[Planning Workbench API] 发送 fetchWeather 请求:', {
        tripId,
        options,
      });

      const params: Record<string, string> = {};
      if (options?.placeIds && options.placeIds.length > 0) {
        params.placeIds = options.placeIds.join(',');
      }
      if (options?.forceRefresh) {
        params.forceRefresh = 'true';
      }
      
      const response = await apiClient.post<ApiResponseWrapper<FetchWeatherResponse>>(
        `/planning-workbench/trips/${tripId}/fetch-weather`,
        {},
        { 
          params,
          timeout: 60000, // 60 秒超时
        }
      );

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] ✅ fetchWeather 成功:', {
        totalPlaces: wrappedResponse.totalPlaces,
        processedPlaces: wrappedResponse.processedPlaces,
        successCount: wrappedResponse.successCount,
        failedCount: wrappedResponse.failedCount,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ fetchWeather 请求失败:', {
        error,
        tripId,
        options,
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * 🆕 查询任务进度
   * GET /api/planning-workbench/tasks/:taskId/progress
   * 
   * P1功能：查询异步任务的执行进度
   */
  getTaskProgress: async (
    taskId: string
  ): Promise<{
    taskId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    progress: {
      total: number; // 总任务数
      processed: number; // 已处理数量
      current?: string; // 当前处理的POI ID或描述
      estimatedRemainingTime?: number; // 预计剩余时间（秒）
    };
    result?: FetchEvidenceResponse; // 任务完成后的结果
    error?: string; // 任务失败时的错误信息
    createdAt: string; // 任务创建时间
    updatedAt: string; // 最后更新时间
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<{
      taskId: string;
      status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      progress: {
        total: number;
        processed: number;
        current?: string;
        estimatedRemainingTime?: number;
      };
      result?: FetchEvidenceResponse;
      error?: string;
      createdAt: string;
      updatedAt: string;
    }>>(
      `/planning-workbench/tasks/${taskId}/progress`
    );
    return handleResponse(response);
  },

  /**
   * 🆕 取消任务
   * POST /api/planning-workbench/tasks/:taskId/cancel
   * 
   * P1功能：取消正在执行的异步任务
   */
  cancelTask: async (
    taskId: string
  ): Promise<{
    taskId: string;
    status: 'CANCELLED';
    message: string;
  }> => {
    const response = await apiClient.post<ApiResponseWrapper<{
      taskId: string;
      status: 'CANCELLED';
      message: string;
    }>>(
      `/planning-workbench/tasks/${taskId}/cancel`
    );
    return handleResponse(response);
  },

  /**
   * Auto综合优化
   * POST /api/planning-workbench/auto-optimize
   * 
   * 批量应用高优先级建议（severity === BLOCKER），帮助用户快速优化行程
   */
  autoOptimize: async (
    data: {
      tripId: string;
      preview?: boolean;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    appliedCount: number;
    suggestions: Array<{
      id: string;
      title: string;
      severity: 'blocker' | 'warn' | 'info';
      applied: boolean;
      error?: string;
    }>;
    impact?: {
      metrics?: {
        fatigue?: number;
        buffer?: number;
        cost?: number;
      };
      risks?: Array<{
        id: string;
        severity: string;
        title: string;
      }>;
    };
  }> => {
    try {
      console.log('[Planning Workbench API] 发送 autoOptimize 请求:', {
        tripId: data.tripId,
        preview: data.preview,
        limit: data.limit,
      });

      const response = await apiClient.post<ApiResponseWrapper<{
        success: boolean;
        appliedCount: number;
        suggestions: Array<{
          id: string;
          title: string;
          severity: 'blocker' | 'warn' | 'info';
          applied: boolean;
          error?: string;
        }>;
        impact?: {
          metrics?: {
            fatigue?: number;
            buffer?: number;
            cost?: number;
          };
          risks?: Array<{
            id: string;
            severity: string;
            title: string;
          }>;
        };
      }>>(
        '/planning-workbench/auto-optimize',
        data,
        {
          timeout: 60000, // 60 秒超时（优化可能需要较长时间）
        }
      );

      const wrappedResponse = handleResponse(response);
      console.log('[Planning Workbench API] ✅ autoOptimize 成功:', {
        success: wrappedResponse.success,
        appliedCount: wrappedResponse.appliedCount,
        suggestionsCount: wrappedResponse.suggestions.length,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Planning Workbench API] ❌ autoOptimize 请求失败:', {
        error,
        tripId: data.tripId,
        message: error.message,
        response: error.response?.data,
      });

      if (error.message) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，优化处理时间较长，请稍后重试');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || 'Auto综合优化失败，请稍后重试');
      }
    }
  },
};
