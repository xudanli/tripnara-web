import type {
  AffectedScopeDisplay,
  DecisionAuthority,
  DecisionOption,
  DecisionProblemDetail,
  DecisionProblemSummary,
  DecisionTradeoffRow,
  PrimaryEnforcement,
  TradeoffDimension,
  TradeoffDirection,
} from '@/types/decision-problem';
import type { DecisionProblemLegacy, DecisionProblemEnforcement } from '@/types/decision-problem';
import type { DecisionCheckerScenarioDto } from '@/types/decision-checker';

export const APPROVER_LABELS: Record<string, string> = {
  TRIP_OWNER: '行程发起人确认',
  AFFECTED_MEMBERS: '受影响成员确认',
  SYSTEM: '系统自动',
  HUMAN_OPERATOR: '人工审核',
};

export const TRADEOFF_DIMENSION_LABELS: Record<string, string> = {
  TIME: '时间',
  COST: '成本',
  FATIGUE: '疲劳',
  POI_COVERAGE: '景点覆盖',
  FLEXIBILITY: '灵活性',
  SAFETY: '安全',
  COMFORT: '舒适度',
  BOOKING_LOSS: '预订影响',
  CERTAINTY: '确定性',
  GROUP_FAIRNESS: '团队公平',
};

export const DECISION_OPTION_TYPE_LABELS: Record<string, string> = {
  REPAIR: '修复',
  ALTERNATIVE: '替代',
  PLAN_B: '备选方案',
  ACCEPT_RISK: '接受风险',
};

export const DECISION_OPTION_SOURCE_LABELS: Record<string, string> = {
  ALTERNATIVE_GENERATOR: '替代方案',
  CONSTRAINT_SOLVER: '约束求解',
  CONSTRAINT_REPAIR: '约束修复',
  NEPTUNE: '替代方案',
  MULTI_PLAN: '多方案',
  USER: '用户',
  RULE_ENGINE: '规则引擎',
};

/** @deprecated 使用 DECISION_OPTION_SOURCE_LABELS */
export const DECISION_ACTION_SOURCE_LABELS = DECISION_OPTION_SOURCE_LABELS;

export function decisionActionSourceLabel(source: string | undefined | null): string | null {
  if (!source) return null;
  const normalized = source.trim().toUpperCase();
  return DECISION_OPTION_SOURCE_LABELS[normalized] ?? DECISION_OPTION_SOURCE_LABELS[source] ?? source;
}

/** SSOT v2 — problem/action origin（如 FEASIBILITY / GATE） */
export function decisionOriginLabel(origin: string | undefined | null): string | null {
  if (!origin) return null;
  const normalized = origin.trim().toUpperCase();
  return DETECTED_BY_LABELS[normalized] ?? origin;
}

/** SSOT v2 — detectors[] 来源探测器徽章文案 */
export function formatDecisionDetectorLabels(detectors: string[] | undefined | null): string[] {
  if (!detectors?.length) return [];
  return detectors
    .map((d) => decisionOriginLabel(d) ?? d.trim())
    .filter(Boolean);
}

export const DETECTED_BY_LABELS: Record<string, string> = {
  FEASIBILITY: '可行性',
  GATE: '门控',
  TRIP_CONSTRAINT: '行程约束',
  VERIFY: '验证',
  GUARDIAN: '守护',
  EXECUTION_MONITOR: '执行监控',
  USER: '用户',
};

/** Gate RULE_ENGINE 选项 id → 文案（V1.6 P1） */
export const GATE_OPTION_LABELS: Record<string, string> = {
  gate_reach_alt_route: '换路线',
  gate_reach_split_leg: '拆段',
  gate_reach_change_mode: '换交通方式',
  gate_safety_shift_date: '改期',
  gate_safety_alt_activity: '替代活动',
  gate_safety_cancel: '取消',
  gate_data_attach_evidence: '补充证据',
  gate_data_revalidate: '重新验证',
  gate_data_downgrade_unconfirmed: '降级为未确认',
  gate_dem_alt_route: '换路线（地形）',
  gate_dem_vehicle_adjust: '调整车型',
  gate_dem_cancel_segment: '取消路段',
};

export const PROBLEM_TYPE_LABELS: Record<string, string> = {
  INFEASIBILITY: '不可行',
  RISK: '风险',
  PREFERENCE_CONFLICT: '偏好冲突',
};

/** primaryEnforcement 展示文案（与 CONSTRAINT_ENFORCEMENT_LABELS 同义） */
export const CONSTRAINT_ENFORCEMENT_LABELS: Record<string, string> = {
  BLOCK: '阻断',
  REQUIRE_ADJUSTMENT: '需调整',
  REQUIRE_CONFIRMATION: '需确认',
  WARN: '提示',
  INFORM: '告知',
};

/** 方案列 badge 展示 */
export const EXECUTION_CAPABILITY_LABELS: Record<string, string> = {
  DIRECT: '可自动应用',
  PARTIAL: '部分自动',
  GUIDED_MANUAL: '需手动步骤',
  ADVISORY_ONLY: '仅供参考',
};

/** 确认主按钮文案（MVP §4） */
export const EXECUTION_CAPABILITY_CONFIRM_LABELS: Record<string, string> = {
  DIRECT: '确认并应用',
  PARTIAL: '应用可自动修改部分',
  GUIDED_MANUAL: '查看手动步骤',
  ADVISORY_ONLY: '查看建议',
};

/** 进入 preview 的 CTA */
export const EXECUTION_CAPABILITY_PREVIEW_LABELS: Record<string, string> = {
  DIRECT: '预览并应用',
  PARTIAL: '预览可自动部分',
  GUIDED_MANUAL: '查看手动步骤',
  ADVISORY_ONLY: '查看建议',
};

export function resolveApproverLabel(authority: DecisionAuthority | null | undefined): string {
  const approver =
    authority?.approver ??
    authority?.requiredApprover;
  if (!approver) return '需确认';
  return APPROVER_LABELS[approver] ?? approver;
}

export function requiresExplicitConfirmation(
  authority: DecisionAuthority | null | undefined,
): boolean {
  return authority?.executionMode === 'EXPLICIT_CONFIRMATION';
}

export function isOverridable(authority: DecisionAuthority | null | undefined): boolean {
  return authority?.overridable !== false;
}

/** 列表左边线 / badge 样式 — 基于 primaryEnforcement，非 issue.type */
export function primaryEnforcementAccentClass(
  enforcement: PrimaryEnforcement | null | undefined,
): string {
  const normalized = String(enforcement ?? '').trim().toUpperCase();
  switch (normalized) {
    case 'BLOCK':
      return 'border-l-4 border-l-gate-reject-foreground';
    case 'REQUIRE_ADJUSTMENT':
      return 'border-l-4 border-l-amber-500';
    case 'REQUIRE_CONFIRMATION':
      return 'border-l-4 border-l-border';
    case 'WARN':
      return 'border-l-4 border-l-border';
    case 'INFORM':
    default:
      return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
  }
}

export function primaryEnforcementBadgeClass(
  enforcement: PrimaryEnforcement | null | undefined,
): string {
  const normalized = String(enforcement ?? '').trim().toUpperCase();
  switch (normalized) {
    case 'BLOCK':
      return 'border border-border/45 bg-muted/20 text-error';
    case 'REQUIRE_ADJUSTMENT':
      return 'border border-border/45 bg-muted/10 text-warning';
    case 'REQUIRE_CONFIRMATION':
      return 'border border-border/45 bg-muted/10 text-warning';
    case 'WARN':
      return 'border border-border/45 bg-muted/8 text-warning';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function primaryEnforcementLabel(
  enforcement: PrimaryEnforcement | null | undefined,
): string {
  const normalized = String(enforcement ?? '').trim().toUpperCase();
  return CONSTRAINT_ENFORCEMENT_LABELS[normalized] ?? (enforcement ? String(enforcement) : '待处理');
}

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  OPEN: '待处理',
  WAITING_DECISION: '待决策',
  ASSESSING: '评估中',
  RESOLVED: '已解决',
  DISMISSED: '已忽略',
};

/** SSOT v2 — 列表 workflowStatus 展示 */
export function workflowStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  return WORKFLOW_STATUS_LABELS[normalized] ?? null;
}

export function executionCapabilityLabel(
  capability: string | null | undefined,
): string | undefined {
  if (!capability) return undefined;
  const normalized = capability.trim().toUpperCase();
  return EXECUTION_CAPABILITY_LABELS[normalized] ?? capability;
}

/** 确认对话框主按钮文案 */
export function executionCapabilityConfirmLabel(
  capability: string | null | undefined,
  confirming = false,
): string {
  if (confirming) {
    const normalized = capability?.trim().toUpperCase();
    if (normalized === 'GUIDED_MANUAL' || normalized === 'ADVISORY_ONLY') return '处理中…';
    return '执行中…';
  }
  const normalized = capability?.trim().toUpperCase();
  if (normalized && EXECUTION_CAPABILITY_CONFIRM_LABELS[normalized]) {
    return EXECUTION_CAPABILITY_CONFIRM_LABELS[normalized];
  }
  return EXECUTION_CAPABILITY_CONFIRM_LABELS.DIRECT;
}

export function executionCapabilityPreviewLabel(
  capability: string | null | undefined,
): string {
  const normalized = capability?.trim().toUpperCase();
  if (normalized && EXECUTION_CAPABILITY_PREVIEW_LABELS[normalized]) {
    return EXECUTION_CAPABILITY_PREVIEW_LABELS[normalized];
  }
  return EXECUTION_CAPABILITY_PREVIEW_LABELS.DIRECT;
}

export function isManualExecutionCapability(
  capability: string | null | undefined,
): boolean {
  const normalized = capability?.trim().toUpperCase();
  return normalized === 'GUIDED_MANUAL' || normalized === 'ADVISORY_ONLY';
}

/** authorize / execute 前：preview 优先，其次所选 option */
export function resolveExecutionCapabilityForSelection(
  options: Array<Pick<DecisionOption, 'id' | 'executionCapability'>>,
  preview: Pick<import('@/types/decision-problem').DecisionOptionPreviewResponse, 'executionCapability'> | null | undefined,
  selectedOptionId?: string | null,
): import('@/types/decision-problem').ExecutionCapability | undefined {
  if (preview?.executionCapability) return preview.executionCapability;
  if (!selectedOptionId) return undefined;
  return options.find((option) => option.id === selectedOptionId)?.executionCapability;
}

/** 证据 freshness — 列表/详情用户文案 */
export function formatEvidenceFreshness(validUntil?: string | null): string | null {
  if (!validUntil) return null;
  const until = new Date(validUntil);
  if (Number.isNaN(until.getTime())) return null;
  const now = Date.now();
  if (until.getTime() <= now) return '信息已过期';
  const hoursLeft = Math.round((until.getTime() - now) / (60 * 60 * 1000));
  if (hoursLeft < 24) return `证据约 ${hoursLeft} 小时内有效`;
  const daysLeft = Math.round(hoursLeft / 24);
  return `证据约 ${daysLeft} 天内有效`;
}

/** 从详情 assertions proofs 推导最早 validUntil */
export function resolveEarliestEvidenceValidUntil(
  detail: { assertions?: Array<{ proofs?: Array<{ validUntil?: string }> }> } | null | undefined,
): string | null {
  let earliest: number | null = null;
  for (const assertion of detail?.assertions ?? []) {
    for (const proof of assertion.proofs ?? []) {
      if (!proof.validUntil) continue;
      const ts = new Date(proof.validUntil).getTime();
      if (Number.isNaN(ts)) continue;
      if (earliest == null || ts < earliest) earliest = ts;
    }
  }
  return earliest != null ? new Date(earliest).toISOString() : null;
}

/**
 * 按 dayIndex 分组 affectedScopeDisplay（只读 BFF 字段）。
 */
/** 同日同 label 去重（BFF 可能对同 POI 发多条 scope） */
export function dedupeAffectedScopeDisplay(
  items: AffectedScopeDisplay[],
): AffectedScopeDisplay[] {
  const merged = new Map<string, AffectedScopeDisplay>();

  for (const item of items) {
    const label = item.label?.trim();
    if (!label) continue;
    const key = `${item.dayIndex ?? 'na'}|${label.toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    merged.set(key, {
      ...existing,
      scopeId: existing.scopeId || item.scopeId,
      secondaryLabel: existing.secondaryLabel ?? item.secondaryLabel,
      placeNames: [
        ...new Set([...(existing.placeNames ?? []), ...(item.placeNames ?? [])]),
      ],
    });
  }

  return [...merged.values()].filter(
    (item, _index, all) => !isRedundantAffectedScopeItem(item, all),
  );
}

/** 同日单 POI 短 label 若已被更长路段 scope 覆盖则隐藏 */
function isRedundantAffectedScopeItem(
  item: AffectedScopeDisplay,
  all: AffectedScopeDisplay[],
): boolean {
  const label = item.label?.trim();
  if (!label || label.includes('->') || label.includes('→') || label.includes('·')) {
    return false;
  }
  return all.some((other) => {
    if (other === item || other.dayIndex !== item.dayIndex) return false;
    const otherLabel = other.label?.trim() ?? '';
    const isRouteLike =
      otherLabel.includes('->') || otherLabel.includes('→') || otherLabel.includes('·');
    if (!isRouteLike) return false;
    return otherLabel.includes(label) || other.placeNames?.includes(label);
  });
}

export function groupAffectedScopeDisplayByDay(
  items: AffectedScopeDisplay[],
): Array<{ dayIndex: number | null; label: string; items: AffectedScopeDisplay[] }> {
  const groups = new Map<number | null, AffectedScopeDisplay[]>();
  for (const item of items) {
    const key = item.dayIndex ?? null;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    })
    .map(([dayIndex, groupItems]) => ({
      dayIndex,
      label: dayIndex != null ? `第 ${dayIndex} 天` : '全程',
      items: groupItems,
    }));
}

export interface ImpactScopeDisplayItem {
  entity?: string;
  fact?: string;
  text?: string;
}

/**
 * @deprecated 详情页请直接读 GET .../decision-problems/:id 的 affectedScopeDisplay[]。
 * 勿用此函数从 assertions / affectedScope 拼装影响范围。
 */
export function collectImpactScopeDisplayItems(detail: {
  affectedScopeSummary?: string;
  affectedDayNumbers?: number[];
  assertions?: Array<{
    proofs?: Array<{
      entity?: string;
      currentFact?: string;
      summary?: string;
    }>;
  }>;
}): ImpactScopeDisplayItem[] {
  if (detail.affectedScopeSummary?.trim()) {
    return [{ text: detail.affectedScopeSummary.trim() }];
  }

  const items: ImpactScopeDisplayItem[] = [];
  const seen = new Set<string>();

  const push = (item: ImpactScopeDisplayItem) => {
    const key = item.entity
      ? `${item.entity}|${item.fact ?? ''}`
      : (item.text ?? item.fact ?? '');
    if (!key.trim() || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const assertion of detail.assertions ?? []) {
    for (const proof of assertion.proofs ?? []) {
      const entity = proof.entity?.trim();
      const fact = (proof.currentFact ?? proof.summary)?.trim();
      if (entity || fact) {
        push({ entity: entity || undefined, fact: fact || undefined });
      }
    }
  }

  if (items.length === 0 && detail.affectedDayNumbers?.length) {
    push({ text: `第 ${detail.affectedDayNumbers.join('、')} 天` });
  }

  return items;
}

/**
 * @deprecated 展示请用 collectImpactScopeDisplayItems
 */
export function collectImpactScopeDisplayLines(detail: Parameters<typeof collectImpactScopeDisplayItems>[0]): string[] {
  return collectImpactScopeDisplayItems(detail).map((item) => {
    if (item.text) return item.text;
    if (item.entity && item.fact) return `${item.entity}：${item.fact}`;
    return item.entity ?? item.fact ?? '';
  }).filter(Boolean);
}

export function isTerminalExecutionStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? '').trim().toUpperCase();
  return (
    normalized === 'APPLIED' ||
    normalized === 'RESOLVED' ||
    normalized === 'PARTIALLY_APPLIED' ||
    normalized === 'PARTIALLY_RESOLVED' ||
    normalized === 'FAILED' ||
    normalized === 'RECORDED' ||
    normalized === 'IDEMPOTENT_REPLAY' ||
    normalized === 'ROLLED_BACK' ||
    normalized === 'DATA_STALE'
  );
}

export function tradeoffDimensionLabel(dimension: TradeoffDimension): string {
  return TRADEOFF_DIMENSION_LABELS[dimension] ?? dimension;
}

export function tradeoffDirectionSymbol(direction: TradeoffDirection): string {
  switch (direction) {
    case 'IMPROVE':
      return '↑';
    case 'WORSEN':
      return '↓';
    default:
      return '—';
  }
}

export function tradeoffDirectionClass(direction: TradeoffDirection): string {
  switch (direction) {
    case 'IMPROVE':
      return 'text-success';
    case 'WORSEN':
      return 'text-error';
    default:
      return 'text-muted-foreground';
  }
}

export function formatTradeoffUnitValue(value: number, unit?: string): string {
  const abs = Math.abs(value);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  switch (unit) {
    case 'MINUTE':
      return `${sign}${abs} 分钟`;
    case 'HOUR':
      return `${sign}${abs} 小时`;
    case 'DAY':
      return `${sign}${abs} 天`;
    case 'CURRENCY':
      return `${sign}${abs}`;
    case 'PERCENT':
      return `${sign}${abs}%`;
    default:
      return unit ? `${sign}${abs} ${unit}` : `${sign}${abs}`;
  }
}

export function formatTradeoffCell(row: DecisionTradeoffRow): string {
  const hasNumeric =
    row.value != null && Number.isFinite(row.value) && Boolean(row.unit);
  const explanation = row.explanation?.trim() ?? '';

  if (hasNumeric) {
    const valuePart = formatTradeoffUnitValue(row.value!, row.unit);
    return explanation ? `${valuePart} · ${explanation}` : valuePart;
  }

  const symbol = tradeoffDirectionSymbol(row.direction);
  return explanation ? `${symbol} ${explanation}` : symbol;
}

/** 收集所有方案涉及的对比维度（稳定排序） */
export function collectTradeoffDimensions(
  options: Array<{ tradeoffs?: DecisionTradeoffRow[] }>,
): TradeoffDimension[] {
  const order: TradeoffDimension[] = [
    'TIME',
    'COST',
    'FATIGUE',
    'POI_COVERAGE',
    'FLEXIBILITY',
    'SAFETY',
    'COMFORT',
    'BOOKING_LOSS',
    'GROUP_FAIRNESS',
  ];
  const seen = new Set<TradeoffDimension>();
  for (const option of options) {
    for (const row of option.tradeoffs ?? []) {
      seen.add(row.dimension);
    }
  }
  const ordered = order.filter((d) => seen.has(d));
  for (const d of seen) {
    if (!ordered.includes(d)) ordered.push(d);
  }
  return ordered;
}

export function findTradeoffForDimension(
  tradeoffs: DecisionTradeoffRow[] | undefined,
  dimension: TradeoffDimension,
): DecisionTradeoffRow | undefined {
  return tradeoffs?.find((row) => row.dimension === dimension);
}

/** 从 sourceRefs 回溯 feasibility issue id（deep link） */
export function resolveSourceRefId(
  problem: Pick<DecisionProblemSummary, 'sourceRefs'> | null | undefined,
  system = 'FEASIBILITY',
): string | undefined {
  const refs = problem?.sourceRefs ?? [];
  const normalized = system.toUpperCase();
  const match = refs.find(
    (ref) =>
      ref.system?.toUpperCase() === normalized ||
      ref.sourceType?.toUpperCase() === normalized ||
      ref.sourceType?.toUpperCase() === `${normalized}_ISSUE`,
  );
  return match?.refId;
}

/** TRIP_CONSTRAINT → TripConstraint.id，用于高亮约束卡片 */
export function resolveTripConstraintRefId(
  problem: Pick<DecisionProblemSummary, 'sourceRefs' | 'detectedBy'> | null | undefined,
): string | undefined {
  if (problem?.detectedBy === 'TRIP_CONSTRAINT') {
    return resolveSourceRefId(problem, 'TRIP_CONSTRAINT');
  }
  return resolveSourceRefId(problem, 'TRIP_CONSTRAINT');
}

function isInternalActionToken(id: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(id.trim());
}

/** BE 修复前 options.title 可能仍为 action enum；返回中文 title 后本映射不再命中 */
export const DECISION_REPAIR_ACTION_LABELS: Record<string, string> = {
  SHIFT_ARRIVAL: '改到达时刻',
  USE_ALTERNATIVE: '替代 POI',
  CHANGE_DATE: '改期',
  BOOK_NOW: '立即预订',
};

function humanizeInternalActionToken(token: string, description?: string): string {
  const mapped = DECISION_REPAIR_ACTION_LABELS[token.trim()];
  if (mapped) return mapped;
  return description?.trim() || '备选方案';
}

export function decisionOptionLabel(option: {
  id: string;
  label?: string;
  title?: string;
  description?: string;
}): string {
  const title = option.title?.trim();
  if (title) {
    if (!isInternalActionToken(title)) return title;
    return humanizeInternalActionToken(title, option.description);
  }
  const label = option.label?.trim();
  if (label) {
    if (!isInternalActionToken(label)) return label;
    return humanizeInternalActionToken(label, option.description);
  }
  const gateLabel = GATE_OPTION_LABELS[option.id];
  if (gateLabel) return gateLabel;
  if (isInternalActionToken(option.id)) {
    return humanizeInternalActionToken(option.id, option.description);
  }
  return option.id;
}

export function decisionOptionSourceLabel(source: string | undefined): string | undefined {
  if (!source) return undefined;
  return DECISION_OPTION_SOURCE_LABELS[source] ?? source;
}

export function isGateOnlyProblem(
  problem: Pick<DecisionProblemSummary, 'detectedBy' | 'semanticKey'> | null | undefined,
): boolean {
  if (!problem) return false;
  if (problem.detectedBy === 'GATE') return true;
  return Boolean(problem.semanticKey?.startsWith('gate:'));
}

export function readPrimaryEnforcementFromSummary(
  item: Pick<DecisionProblemSummary, 'primaryEnforcement'>,
): PrimaryEnforcement | undefined {
  return item.primaryEnforcement;
}

export function readPrimaryEnforcementFromDetail(
  problem: Pick<DecisionProblemLegacy, 'assertions'> | null | undefined,
): DecisionProblemEnforcement | undefined {
  return problem?.assertions?.[0]?.enforcement;
}

/** 决策空间标题 · Day 标签（优先问题自身，避免 Legacy 冲突 day 错位） */
export function dayLabelForDecisionProblem(
  problem?: Pick<DecisionProblemSummary, 'title' | 'affectedDayNumbers'> | null,
): string | null {
  if (!problem) return null;
  const days = problem.affectedDayNumbers;
  if (days?.length) {
    if (days.length === 1) return `Day ${days[0]}`;
    return `Day ${days.join('、')}`;
  }
  const match = problem.title.match(/第(\d+)日/);
  if (match) return `Day ${match[1]}`;
  return null;
}

/** 决策空间 · 问题说明（优先 BFF detail，勿回落到行程级 decision-checker 主冲突） */
export function resolveDecisionProblemDescription(
  detail: DecisionProblemDetail | null | undefined,
  problem?: DecisionProblemSummary | null,
): string | undefined {
  const direct = detail?.description?.trim();
  if (direct) return direct;

  for (const assertion of detail?.assertions ?? []) {
    const message = assertion.message?.trim() || assertion.conclusion?.trim();
    if (message) return message;
  }

  const scopeSummary = problem?.affectedScopeSummary?.trim();
  if (scopeSummary) return scopeSummary;

  return undefined;
}

const SCENARIO_VARIANTS: Array<'blue' | 'orange' | 'purple'> = ['blue', 'orange', 'purple'];

/** 将 decision-problems options 映射为决策空间方案卡片 */
export function mapDecisionOptionsToCheckerScenarios(
  options: DecisionOption[],
): DecisionCheckerScenarioDto[] {
  const letters = ['A', 'B', 'C', 'D'];
  return options.slice(0, 3).map((option, index) => {
    const tradeoff = option.tradeoffs?.[0];
    const metrics: DecisionCheckerScenarioDto['metrics'] = tradeoff
      ? [
          {
            key: `${option.id}-${tradeoff.dimension}`,
            label: tradeoffDimensionLabel(tradeoff.dimension),
            displayValue: formatTradeoffCell(tradeoff),
            tone: 'neutral',
          },
        ]
      : [];

    return {
      id: option.id,
      letter: letters[index],
      title: decisionOptionLabel(option),
      badge: index === 0 ? 'recommended' : 'alternative',
      badgeLabel: index === 0 ? '推荐' : '备选',
      description: option.description?.trim() || '查看方案详情与 tradeoffs。',
      variant: SCENARIO_VARIANTS[index] ?? 'blue',
      metrics,
    };
  });
}
