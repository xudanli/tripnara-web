/** Decision Semantics BFF — V1.5 + V1.6（trip-scoped decision-problems + decisions） */

export type DecisionProblemType =
  | 'INFEASIBILITY'
  | 'RISK'
  | 'PREFERENCE_CONFLICT'
  | (string & {});

export type DecisionProblemStatus =
  | 'OPEN'
  | 'ASSESSING'
  | 'WAITING_DECISION'
  | 'RESOLVED'
  | 'DISMISSED'
  | (string & {});

/** 列表/详情 enforcement 语义（替代 constraint.type / issue.type 猜测） */
export type PrimaryEnforcement =
  | 'BLOCK'
  | 'REQUIRE_ADJUSTMENT'
  | 'REQUIRE_CONFIRMATION'
  | 'WARN'
  | 'INFORM'
  | (string & {});

/** @deprecated 断言级旧 enforcement；列表请用 primaryEnforcement */
export type DecisionProblemEnforcement =
  | 'HARD'
  | 'SOFT'
  | 'ADVISORY'
  | 'OFF'
  | 'ON'
  | 'MUST_HANDLE'
  | (string & {});

export type DecisionProblemDetectedBy =
  | 'FEASIBILITY'
  | 'GATE'
  | 'TRIP_CONSTRAINT'
  | 'VERIFY'
  | 'GUARDIAN'
  | 'EXECUTION_MONITOR'
  | 'USER'
  | (string & {});

/** @deprecated 使用 DecisionProblemDetectedBy */
export type DecisionDetectedBy = DecisionProblemDetectedBy;

export type AssertionNature = 'HARD' | 'SOFT' | 'RISK' | (string & {});

export type DecisionOptionType =
  | 'REPAIR'
  | 'ALTERNATIVE'
  | 'PLAN_B'
  | 'ACCEPT_RISK'
  | (string & {});

export type DecisionOptionSource =
  | 'CONSTRAINT_REPAIR'
  | 'NEPTUNE'
  | 'MULTI_PLAN'
  | 'USER'
  | 'RULE_ENGINE'
  | (string & {});

export type TradeoffDimension =
  | 'TIME'
  | 'COST'
  | 'FATIGUE'
  | 'POI_COVERAGE'
  | 'FLEXIBILITY'
  | 'SAFETY'
  | 'COMFORT'
  | 'BOOKING_LOSS'
  | 'GROUP_FAIRNESS'
  | (string & {});

export type TradeoffDirection = 'IMPROVE' | 'WORSEN' | 'UNCHANGED';

export type TradeoffUnit = 'DAY' | 'HOUR' | 'MINUTE' | 'CURRENCY' | 'PERCENT' | (string & {});

/** options[].tradeoffs[] / preview.tradeoffs[] */
export interface DecisionTradeoffRow {
  dimension: TradeoffDimension;
  direction: TradeoffDirection;
  value?: number;
  unit?: TradeoffUnit;
  /** POI_COVERAGE+PERCENT：展示 baseline% (+delta%) */
  baselineValue?: number;
  /** 短摘要（规则/校验状态） */
  explanation?: string;
  /** BFF 投影：结合行程上下文的完整叙述（优先于 explanation 展示） */
  contextualNarrative?: string;
}

/** options[] — 方案级路线预览（决策空间卡片） */
export interface DecisionOptionRoutePreview {
  placeNames?: string[];
}

export interface DecisionSourceRef {
  /** BFF: FEASIBILITY | GATE | TRIP_CONSTRAINT | … */
  system?: string;
  refId: string;
  /** 兼容旧字段 */
  sourceType?: string;
}

/** @deprecated 使用 DecisionSourceRef */
export interface DecisionProblemSourceRef extends DecisionSourceRef {}

export interface DecisionAuthority {
  approver?: 'TRIP_OWNER' | 'AFFECTED_MEMBERS' | 'SYSTEM' | 'HUMAN_OPERATOR' | (string & {});
  /** BFF 字段 */
  requiredApprover?: string;
  executionMode?: 'EXPLICIT_CONFIRMATION' | 'AUTO' | (string & {});
  overridable?: boolean;
}

export interface DecisionProblemListMeta {
  tripId: string;
  tripVersion: string;
  total: number;
  byType?: Partial<Record<DecisionProblemType, number>>;
  byStatus?: Partial<Record<DecisionProblemStatus, number>>;
  generatedAt: string;
}

export type ProblemResolutionKind = 'DECISION_EXECUTED' | 'VALIDATION_CONFIRMED';

export interface DecisionProblemSummary {
  id: string;
  type: DecisionProblemType;
  title: string;
  status: DecisionProblemStatus;
  primaryEnforcement: PrimaryEnforcement;
  affectedDayNumbers?: number[];
  /** Gateway v2 — scope.dayIds 与天次排序/分组 */
  scope?: import('@/types/unified-decision').UnifiedDecisionProblemListScope;
  detectedBy?: DecisionProblemDetectedBy;
  sourceRefs?: DecisionSourceRef[];
  semanticKey?: string;
  /** V1.0 — 决策/验证回写 */
  resolvedByDecisionId?: string;
  resolvedAt?: string;
  resolutionKind?: ProblemResolutionKind;
  /** L2 卡片 — BFF 可选 */
  optionsCount?: number;
  evidenceValidUntil?: string;
  affectedMemberIds?: string[];
  affectedScopeSummary?: string;
  /** Gateway v2 — 左栏分类（日程/交通/…） */
  categoryLabel?: string;
  /** Gateway v2 — 完整诊断句（详情用，非左栏 title） */
  description?: string;
  /** Unified Gateway：L2 链路（勿硬编码 destination） */
  /** @deprecated v2 使用 writeChain / actionability.writeChain */
  flowKind?: 'CANONICAL_L2' | 'LEGACY_V15';
  /** SSOT v2 — 写路径（替代 flowKind 分支） */
  writeChain?: import('@/types/unified-decision').DecisionWriteChain;
  actionability?: import('@/types/unified-decision').DecisionActionability;
  /** v2 实例键 */
  instanceKey?: string;
  /** v2 工作流 / 执行态（列表只读） */
  workflowStatus?: import('@/types/unified-decision').DecisionWorkflowStatus;
  executionStatus?: import('@/types/unified-decision').DecisionExecutionStatusSurface;
  /** v2 详情 actions[] 投影（列表通常不含） */
  actions?: import('@/types/unified-decision').DecisionAction[];
  /** RFC-001 read model（Gateway canonical.problems） */
  canonicalView?: import('@/types/unified-decision').Rfc001DecisionCenterProblemView;
  /** Persona 展示（Abu / Dr.Dre） */
  personaLabel?: string;
  /** Gateway 路由（PRIMARY / LEGACY_FALLBACK） */
  route?: import('@/types/unified-decision').DecisionRouteView;
  /** tripnara.impact_scope@v1 — 列表卡片 i18n 渲染（Canonical） */
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
  /** @deprecated 后端不再返回；保留 Legacy 兼容 */
  impactScopeHeadline?: string;
  /** causal-trace-v1 — 列表副标题 enrich */
  causalStoryHeadline?: string;
  /** causal-trace-v1 — 安全角标文案 */
  guardianCausalHeadline?: string;
}

export interface DecisionProblemListResponse {
  meta?: DecisionProblemListMeta;
  items: DecisionProblemSummary[];
}

export interface DecisionProblemProof {
  evidenceSource?: string;
  validUntil?: string;
  /** 可读范围标签，如「第4天 · 拉特拉尔角 → 红沙滩」 */
  entity?: string;
  currentFact?: string;
  summary?: string;
}

/** 详情 assertions[]（ConstraintAssertion） */
export interface DecisionProblemAssertion {
  id?: string;
  nature?: AssertionNature;
  enforcement?: DecisionProblemEnforcement;
  overridable?: boolean;
  conclusion?: string;
  message?: string;
  passed?: boolean;
  proofs?: DecisionProblemProof[];
}

export interface DecisionAffectedScopeEntry {
  type?: 'DAY' | 'MEMBER' | 'SEGMENT' | 'TRIP' | (string & {});
  refId?: string;
  label?: string;
}

/** GET .../decision-problems/:id — 影响范围展示（勿拼 affectedScope 机器 ID） */
export type AffectedScopeType =
  | 'DAY'
  | 'ITINERARY_ITEM'
  | 'LEG'
  | 'SEGMENT'
  | 'TRIP'
  | 'MEMBER'
  | (string & {});

export interface AffectedScopeDisplay {
  scopeType: AffectedScopeType;
  scopeId: string;
  label: string;
  secondaryLabel?: string;
  dayIndex?: number;
  placeNames?: string[];
}

export interface DecisionMemberImpact {
  memberId?: string;
  memberName?: string;
  summary?: string;
  derivedFrom?: string;
}

export interface DecisionProblemEntity extends DecisionProblemSummary {
  tripId?: string;
  description?: string;
  detectedAt?: string;
  tripVersion?: string;
  affectedScope?: DecisionAffectedScopeEntry[];
  sourceRefs?: DecisionSourceRef[];
  assertionIds?: string[];
  authority?: DecisionAuthority;
}

export interface DecisionProblemDetail extends DecisionProblemEntity {
  assertions?: DecisionProblemAssertion[];
  memberImpacts?: DecisionMemberImpact[];
  /** P1 — 结构化影响范围（优先于 assertions / affectedScope） */
  affectedScopeDisplay?: AffectedScopeDisplay[];
  /** Canonical L2 — tripnara.impact_scope@v1（Legacy 仍用 affectedScopeDisplay） */
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
  /** SSOT v2 */
  instanceKey?: string;
  workflowStatus?: import('@/types/unified-decision').DecisionWorkflowStatus;
  executionStatus?: import('@/types/unified-decision').DecisionExecutionStatusSurface;
  actionability?: import('@/types/unified-decision').DecisionActionability;
  writeChain?: import('@/types/unified-decision').DecisionWriteChain;
  actions?: import('@/types/unified-decision').DecisionAction[];
  resolution?: import('@/types/unified-decision').DecisionProblemResolutionView;
  /** causal-trace-v1 */
  causalTraceRef?: import('@/types/causal-trace').CausalTraceReference;
  causalStoryView?: import('@/types/causal-trace').CausalStoryView;
  guardianCausalStoryView?: import('@/types/causal-trace').CausalStoryView;
}

/** @deprecated 旧 GET /decision-problems/:id 最小响应 */
export interface DecisionProblemLegacy {
  id: string;
  assertions?: DecisionProblemAssertion[];
  primaryEnforcement?: PrimaryEnforcement;
}

/** @deprecated 使用 DecisionProblemLegacy */
export type DecisionProblem = DecisionProblemLegacy;

/** V1.0 P1 — 方案可执行程度 */
export type ExecutionCapability =
  | 'DIRECT'
  | 'PARTIAL'
  | 'GUIDED_MANUAL'
  | 'ADVISORY_ONLY'
  | (string & {});

export interface RepairCommand {
  commandType?: string;
  targetRefs?: Array<{ type?: string; refId?: string; [key: string]: unknown }>;
  parameters?: Record<string, unknown>;
}

export interface DecisionOption {
  id: string;
  label?: string;
  /** BFF 常用 title */
  title?: string;
  description?: string;
  type?: DecisionOptionType;
  source?: DecisionOptionSource;
  requiresConfirmation?: boolean;
  executable?: boolean;
  authority?: DecisionAuthority;
  routePreview?: DecisionOptionRoutePreview;
  tradeoffs?: DecisionTradeoffRow[];
  /** V1.0 P1 */
  repairCommand?: RepairCommand;
  executionCapability?: ExecutionCapability;
}

export interface DecisionOptionsResponse {
  problemId?: string;
  tripId?: string;
  options: DecisionOption[];
  generatedAt?: string;
}

export interface DecisionMutationOperation {
  type?: string;
  label?: string;
  description?: string;
}

export interface TripMutationSet {
  operations?: DecisionMutationOperation[];
}

/** @deprecated 使用 TripMutationSet */
export interface DecisionProposedMutations extends TripMutationSet {}

export interface DecisionOptionPreviewResponse {
  problemId?: string;
  optionId: string;
  tripId?: string;
  tradeoffs?: DecisionTradeoffRow[];
  proposedMutations?: TripMutationSet;
  authority?: DecisionAuthority;
  predictedImpact?: Record<string, unknown>;
  repairPreview?: Record<string, unknown>;
  /** unified preview 透传 — 提交 resolutions 时需原样回传 */
  requiredAcknowledgements?: string[];
  /** @deprecated 使用 requiredAcknowledgements */
  acknowledgementRequired?: string[];
  repairCommand?: RepairCommand;
  executionCapability?: ExecutionCapability;
  generatedAt?: string;
  /** causal-trace-v1 */
  causalTraceRef?: import('@/types/causal-trace').CausalTraceReference;
  causalStoryView?: import('@/types/causal-trace').CausalStoryView;
  guardianCausalStoryView?: import('@/types/causal-trace').CausalStoryView;
}

export type DecisionRecordStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'EXECUTED'
  | 'DEFERRED'
  | (string & {});

export interface DecisionLedgerRefs {
  sourceNodeIds: string[];
  invalidatedNodeIds?: string[];
  recomputedNodeIds?: string[];
  ledgerRunId?: string;
  ledgerSnapshotVersion?: number;
  causedByAnnotatedNodeIds?: string[];
}

export interface DecisionValidationBaseline {
  feasibilitySnapshotId?: string;
  tripVersion?: string;
  capturedAt?: string;
  [key: string]: unknown;
}

export interface DecisionRecord {
  id: string;
  tripId: string;
  problemId: string;
  selectedOptionId: string;
  status: DecisionRecordStatus;
  validationStatus?: DecisionOutcomeVerdict;
  tripVersionBefore?: string;
  tripVersionAfter?: string;
  decidedAt?: string;
  reason?: string;
  actualMutation?: TripMutationSet;
  ledgerRefs?: DecisionLedgerRefs;
  expectedOutcomes?: DecisionExpectedOutcome[];
  validationBaseline?: DecisionValidationBaseline;
  lastOutcomeValidation?: DecisionOutcomeValidationSummary;
}

export interface DecisionApplyResult {
  status?: string;
  message?: string;
  actionType?: string;
  persisted?: boolean;
  blockerId?: string;
}

export interface CreateDecisionRequest {
  problemId: string;
  selectedOptionId: string;
  reason?: string;
  acknowledgement?: string[];
  rejectedOptionIds?: string[];
  /** 默认 true：批准后调用 feasibility.applyRepair */
  execute?: boolean;
  idempotencyKey?: string;
}

export type DecisionExecutionStatus =
  | 'RECORDED'
  | 'APPLYING'
  | 'APPLIED'
  | 'RESOLVED'
  | 'PARTIALLY_APPLIED'
  | 'PARTIALLY_RESOLVED'
  | 'FAILED'
  | 'IDEMPOTENT_REPLAY'
  | 'ROLLED_BACK'
  | 'DATA_STALE'
  | (string & {});

export interface DecisionPostApplyCoherenceV1 {
  coherent?: boolean;
  failureMessage?: string;
  needsRepair?: boolean;
}

export interface DecisionEvidenceFreshnessVerdict {
  blocked?: boolean;
  staleEvidenceTypes?: string[];
  message?: string;
}

export interface DecisionExecutionStatusResponse {
  status: DecisionExecutionStatus;
  explanation?: string;
  recordStatus?: DecisionRecordStatus;
  validationStatus?: DecisionOutcomeVerdict;
  validationVerdict?: DecisionOutcomeVerdict;
  repairCommandApplied?: boolean;
  /** V1.6.2 — 应用后一致性 */
  postApplyCoherence?: DecisionPostApplyCoherenceV1;
  needsRepair?: boolean;
  evidenceFreshnessBlock?: DecisionEvidenceFreshnessVerdict;
}

export interface DecisionProblemResolutionSnapshot {
  problemId: string;
  status: 'RESOLVED';
  semanticKey?: string;
  resolvedAt: string;
  resolvedByDecisionId: string;
  resolution: ProblemResolutionKind;
}

export interface CreateDecisionResponse {
  decision: DecisionRecord;
  tripVersionAfter?: string;
  appliedMutations?: TripMutationSet;
  applyResult?: DecisionApplyResult;
  executionStatus?: DecisionExecutionStatusResponse | DecisionExecutionStatus;
  problemResolution?: DecisionProblemResolutionSnapshot;
  idempotentReplay?: boolean;
  effectiveDecisionId?: string;
}

export interface DecisionCenterRecentDecisionSnapshot {
  /** 前端归一化后的决策 ID（BFF 可能只回 `decisionId`） */
  id: string;
  /** BFF overview 原始字段，getCenterOverview 会合并到 `id` */
  decisionId?: string;
  problemId?: string;
  selectedOptionId?: string;
  status?: DecisionRecordStatus;
  /** BFF 账本态；L1 展示以 executionStatus 为准 */
  recordStatus?: DecisionRecordStatus;
  executionStatus?: DecisionExecutionStatus;
  needsRepair?: boolean;
  decidedAt?: string;
  title?: string;
}

export interface DecisionCenterOverview {
  headline: string;
  problemCounts: {
    open: number;
    byEnforcement: Partial<Record<PrimaryEnforcement, number>>;
  };
  feasibility: {
    canStartExecute: boolean;
    mustHandleCount: number;
  };
  actionableProblemCount: number;
  affectedDayNumbers?: number[];
  affectedMemberIds?: string[];
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[];
  /** SSOT v2 — 阻断级问题数（优先于 byEnforcement.BLOCK） */
  blockingProblemCount?: number;
  /** SSOT v2 — 问题出现次数（可能大于 openCount） */
  occurrenceCount?: number;
  /** SSOT v2 — 与 list meta.openCount 对齐 */
  totalOpenProblemCount?: number;
  /** SSOT v2 — 已关闭问题数（Gateway 未回时由 Legacy byStatus 推导） */
  resolvedProblemCount?: number;
  totalProblemCount?: number;
  /** causal-trace-v1 — Abu 安全视角（首个开放旅行问题） */
  guardianHeadline?: string;
  guardianAssessment?: string;
}

export type DecisionRecordDetail = DecisionRecord;

export interface DecisionOutcomeValidationSummary {
  id?: string;
  verdict?: DecisionOutcomeVerdict;
  confidence?: number;
  evaluatedAt?: string;
  explanation?: string;
  failureReasons?: OutcomeFailureReason[];
}

export type DecisionOutcomeMetric =
  | 'CONSTRAINT_VIOLATION'
  | 'DRIVING_DURATION'
  | 'ACTIVITY_COMPLETION'
  | 'ARRIVAL_TIME'
  | (string & {});

export type DecisionOutcomeVerdict =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PARTIALLY_CONFIRMED'
  | 'REFUTED'
  | 'INCONCLUSIVE'
  | (string & {});

export type DecisionOutcomeUnit = 'MINUTE' | 'HOUR' | 'DAY' | 'PERCENT' | 'CURRENCY' | (string & {});

export interface DecisionExpectedOutcome {
  metric: DecisionOutcomeMetric;
  expectedValue: boolean | number | string;
  tolerance?: number;
  unit?: DecisionOutcomeUnit;
  affectedScope?: DecisionAffectedScopeEntry[];
}

export type DecisionObservedSource =
  | 'SYSTEM_INFERENCE'
  | 'POI_FEEDBACK'
  | 'USER_ARRIVAL_CLICK'
  | 'ITINERARY_ITEM_STATUS'
  | 'BOOKING_CHECKIN'
  | 'NAVIGATION_EVENT'
  | 'GPS'
  | 'FEASIBILITY'
  | (string & {});

export interface DecisionObservedOutcome {
  metric: DecisionOutcomeMetric;
  actualValue: boolean | number | string;
  source?: DecisionObservedSource;
  confidence?: number;
}

export type OutcomeFailureReason =
  | 'PREDICTION_ERROR'
  | 'DATA_STALE'
  | 'EXECUTION_DEVIATION'
  | 'USER_BEHAVIOR_CHANGE'
  | 'EXTERNAL_EVENT'
  | 'INSUFFICIENT_EVIDENCE'
  | (string & {});

export type ExperienceOutcomeMetric = 'USER_SATISFACTION' | 'REGRET' | 'GROUP_CONFLICT' | (string & {});

export interface ExperienceOutcome {
  metric: ExperienceOutcomeMetric;
  value: number | string;
  source: 'USER_CONFIRMATION' | 'SURVEY' | (string & {});
  observedAt: string;
  context?: string;
}

export interface DecisionOutcomeValidation {
  id: string;
  decisionId: string;
  tripId: string;
  expectedOutcomes: DecisionExpectedOutcome[];
  observedOutcomes: DecisionObservedOutcome[];
  experienceOutcomes?: ExperienceOutcome[];
  verdict: DecisionOutcomeVerdict;
  confidence?: number;
  explanation?: string;
  evaluatedAt?: string;
  failureReasons?: OutcomeFailureReason[];
}

export interface DecisionLedgerNodeDecisionResponse {
  decisionId: string;
  record?: DecisionRecord;
}

/** API 错误码 */
export type DecisionSemanticsErrorCode =
  | 'DECISION_ACKNOWLEDGEMENT_REQUIRED'
  | 'DECISION_APPLY_FAILED'
  | 'DECISION_PROBLEM_NOT_FOUND'
  | 'DECISION_OPTION_NOT_FOUND'
  | 'DECISION_RECORD_NOT_FOUND'
  | 'DECISION_NOT_FOUND_FOR_LEDGER_NODE'
  | 'CAUSAL_TRACE_STALE'
  | (string & {});
