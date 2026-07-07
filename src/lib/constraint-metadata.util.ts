import type { ConstraintEditorDraft, ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import { formatCatalogHardRuleFromDraft } from '@/lib/constraint-catalog-editor.util';
import { apiConstraintIdToUi, uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import {
  resolveEnforcementRuleLabelDefault,
  resolveEnforcementViolationLabel,
  resolveHardEnforcementSpecForConstraint,
} from '@/lib/trip-constraint-hard-enforcement.util';
import type { TripConstraint, TripConstraintScope } from '@/types/trip-constraints';
import {
  buildConstraintScopeDisplayRows,
  formatConstraintScopeSummary,
  parseScopeBindingFromConstraint,
  severityLabelFromDraftType,
} from '@/lib/constraint-scope.util';

export interface HardConstraintMetadata {
  /** 例：已启用：不夜驾 */
  enabledLabel: string;
  /** 单行摘要（列表 / contractMeta 回退） */
  scopeLabel: string;
  /** 结构化作用范围 */
  scopeRows: import('@/types/constraint-scope').ConstraintScopeDisplayRow[];
  ruleLabel: string;
  violationLabel: string;
}

export const HARD_CONSTRAINT_SECTION_INTRO =
  '不可违反的硬约束 — 任何方案都不能突破的边界';

type StaticRuleDef = {
  ruleLabel: string;
  violationLabel: string;
  /** 动态规则模板，{value} 占位 */
  ruleTemplate?: (ctx: RuleBuildContext) => string | null;
};

interface RuleBuildContext {
  entry: ConstraintListEntry;
  apiConstraint?: TripConstraint | null;
  draft?: ConstraintEditorDraft | null;
  metaKey: string;
}

function formatScopeLabel(scope?: TripConstraintScope | null): string {
  if (!scope?.type || scope.type === 'TRIP') return '整趟行程';
  if (scope.type === 'DAY') {
    const day = scope.dayIndex;
    return day != null ? `第 ${day} 天` : '指定日期';
  }
  if (scope.type === 'MEMBER') {
    const count = scope.memberIds?.length ?? 0;
    return count > 0 ? `${count} 位成员` : '指定成员';
  }
  if (scope.type === 'MEMBER_GROUP') return '成员组';
  return String(scope.type);
}

function formatEditorScope(scope: ConstraintEditorDraft['scope'], dayIndex?: number): string {
  if (scope === 'TRIP') return '整趟行程';
  if (scope === 'DAY') return dayIndex != null ? `第 ${dayIndex} 天` : '指定日期';
  if (scope === 'MEMBER') return '指定成员';
  return '整趟行程';
}

function violationForHardConstraint(
  entry: Pick<ConstraintListEntry, 'category' | 'locked'>,
  staticViolation?: string,
): string {
  if (staticViolation) return staticViolation;
  if (entry.category === 'SAFETY' || entry.category === 'RISK') return '阻断执行';
  if (entry.locked) return '阻断执行';
  return '需确认后调整';
}

function readStructuredRuleFromApi(
  apiConstraint?: TripConstraint | null,
): Partial<Pick<HardConstraintMetadata, 'ruleLabel' | 'violationLabel'>> | null {
  if (!apiConstraint?.value || typeof apiConstraint.value !== 'object') return null;
  const value = apiConstraint.value as Record<string, unknown>;
  const rule =
    value.judgmentRule ??
    value.rule ??
    value.ruleText ??
    value.ruleDescription;
  const violation =
    value.violationResult ??
    value.violation ??
    value.onViolation ??
    value.violationAction;
  if (typeof rule !== 'string' && typeof violation !== 'string') return null;
  return {
    ruleLabel: typeof rule === 'string' ? rule : undefined,
    violationLabel: typeof violation === 'string' ? violation : undefined,
  };
}

function readNumericFromConstraint(
  apiConstraint?: TripConstraint | null,
  draft?: ConstraintEditorDraft | null,
): number | null {
  if (draft?.targetValue != null && Number.isFinite(draft.targetValue)) return draft.targetValue;
  const raw = apiConstraint?.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const v = raw as Record<string, unknown>;
    for (const key of ['value', 'maxHours', 'maxKm', 'limit', 'total']) {
      const n = v[key];
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** UI id / c_* / templateId → 静态规则 */
const STATIC_RULES: Record<string, StaticRuleDef> = {
  // —— 时间 ——
  time_range: {
    ruleLabel: '出发与返程日期不可超出设定范围',
    violationLabel: '阻断执行',
  },
  c_time_range: {
    ruleLabel: '出发与返程日期不可超出设定范围',
    violationLabel: '阻断执行',
  },
  earliest_departure: {
    ruleLabel: '每日最早出发时间不早于设定时刻',
    violationLabel: '阻断执行',
  },
  latest_end: {
    ruleLabel: '每日结束时间不晚于设定时刻',
    violationLabel: '阻断执行',
  },
  max_daily_activity: {
    ruleLabel: '单日活动总时长不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const hours = readNumericFromConstraint(apiConstraint, draft);
      return hours != null ? `单日活动总时长不超过 ${hours} 小时` : null;
    },
  },
  c_pacing_level: {
    ruleLabel: '每日活动强度不超过设定节奏等级',
    violationLabel: '需确认后调整',
  },
  pacing: {
    ruleLabel: '每日活动强度不超过设定节奏等级',
    violationLabel: '需确认后调整',
  },
  daily_drive: {
    ruleLabel: '单日驾驶时长不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const hours = readNumericFromConstraint(apiConstraint, draft);
      return hours != null ? `单日驾驶时长不超过 ${hours} 小时` : null;
    },
  },
  max_daily_drive: {
    ruleLabel: '单日驾驶时长不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const hours = readNumericFromConstraint(apiConstraint, draft);
      return hours != null ? `单日驾驶时长不超过 ${hours} 小时` : null;
    },
  },
  c_max_daily_drive: {
    ruleLabel: '单日驾驶时长不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const hours = readNumericFromConstraint(apiConstraint, draft);
      return hours != null ? `单日驾驶时长不超过 ${hours} 小时` : null;
    },
  },
  max_segment_distance: {
    ruleLabel: '单段连续驾驶距离不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const km = readNumericFromConstraint(apiConstraint, draft);
      return km != null ? `单段连续驾驶距离不超过 ${km} km` : null;
    },
  },
  c_max_segment_distance: {
    ruleLabel: '单段连续驾驶距离不超过设定上限',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const km = readNumericFromConstraint(apiConstraint, draft);
      return km != null ? `单段连续驾驶距离不超过 ${km} km` : null;
    },
  },
  required_rest: {
    ruleLabel: '必须保留规定的休息与缓冲时段',
    violationLabel: '阻断执行',
  },
  fixed_appointments: {
    ruleLabel: '固定航班、预约、入住时间不可被挪动',
    violationLabel: '阻断执行',
  },
  // —— 预算 ——
  budget: {
    ruleLabel: '总花费不得超过预算上限（含容忍额度）',
    violationLabel: '阻断执行',
    ruleTemplate: ({ draft, apiConstraint }) => {
      const total = readNumericFromConstraint(apiConstraint, draft);
      const currency = draft?.currency ?? 'CNY';
      return total != null ? `总花费不得超过 ${total} ${currency}` : null;
    },
  },
  c_budget_total: {
    ruleLabel: '总花费不得超过预算上限（含容忍额度）',
    violationLabel: '阻断执行',
  },
  accommodation: {
    ruleLabel: '单晚住宿标准不低于设定要求',
    violationLabel: '需确认后调整',
  },
  activity_budget: {
    ruleLabel: '单项活动花费不超过设定上限',
    violationLabel: '阻断执行',
  },
  allow_budget_overrun: {
    ruleLabel: '是否允许临时超预算由设定开关决定',
    violationLabel: '需确认后调整',
  },
  budget_overrun_tolerance: {
    ruleLabel: '超预算幅度不得超过容忍额度',
    violationLabel: '阻断执行',
  },
  // —— 人员 ——
  travelers: {
    ruleLabel: '规划与预算按设定人数计算',
    violationLabel: '阻断执行',
  },
  c_travelers: {
    ruleLabel: '规划与预算按设定人数计算',
    violationLabel: '阻断执行',
  },
  elderly_walk_limit: {
    ruleLabel: '老人单日步行距离不超过设定上限',
    violationLabel: '阻断执行',
  },
  child_nap_time: {
    ruleLabel: '儿童午睡时段内不得安排高强度活动',
    violationLabel: '阻断执行',
  },
  accessibility: {
    ruleLabel: '行程须满足无障碍通行要求',
    violationLabel: '阻断执行',
  },
  dietary_restrictions: {
    ruleLabel: '餐饮安排须避开设定饮食禁忌',
    violationLabel: '阻断执行',
  },
  motion_sickness: {
    ruleLabel: '避免引发晕车、恐高等不适的安排',
    violationLabel: '阻断执行',
  },
  avoid_activity_type: {
    ruleLabel: '不得安排成员声明不参加的活动类型',
    violationLabel: '阻断执行',
  },
  // —— 地点 ——
  must_go: {
    ruleLabel: '必去地点必须纳入可行行程',
    violationLabel: '需确认后调整',
  },
  c_must_places: {
    ruleLabel: '必去地点必须纳入可行行程',
    violationLabel: '需确认后调整',
  },
  transport: {
    ruleLabel: '基础交通方式不可随意变更',
    violationLabel: '需确认后调整',
  },
  c_transport_mode: {
    ruleLabel: '基础交通方式不可随意变更',
    violationLabel: '需确认后调整',
  },
  // —— 风险 ——
  no_night_drive: {
    ruleLabel: '日落后 30 分钟不得继续驾驶',
    violationLabel: '阻断执行',
  },
  c_no_night_drive: {
    ruleLabel: '日落后 30 分钟不得继续驾驶',
    violationLabel: '阻断执行',
  },
  road_restrictions: {
    ruleLabel: '不走封闭、未开放或未铺装道路',
    violationLabel: '阻断执行',
  },
  c_world_feasibility: {
    ruleLabel: '不走封闭、未开放或未铺装道路',
    violationLabel: '阻断执行',
  },
  no_unpaved_road: {
    ruleLabel: '不得安排未铺装或高风险路况路段',
    violationLabel: '阻断执行',
  },
  no_bad_weather: {
    ruleLabel: '恶劣天气条件下不得安排受影响出行',
    violationLabel: '阻断执行',
  },
  no_high_risk_activity: {
    ruleLabel: '不得安排高风险或未评估活动',
    violationLabel: '阻断执行',
  },
  no_unverified_route: {
    ruleLabel: '不接受缺乏官方证据或验证的路线',
    violationLabel: '阻断执行',
  },
};

export function resolveHardConstraintMetaKey(
  entry: ConstraintListEntry,
  apiConstraint?: TripConstraint | null,
): string {
  const candidates = [
    entry.id,
    apiConstraint?.id ? apiConstraintIdToUi(apiConstraint.id) : null,
    apiConstraint?.id,
    apiConstraint?.source?.templateId,
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    if (key.startsWith('c_') && STATIC_RULES[key.slice(2)]) return key.slice(2);
    if (STATIC_RULES[key]) return key;
  }
  for (const key of candidates) {
    if (key.startsWith('c_')) return key.slice(2);
  }
  return candidates[0] ?? entry.id;
}

function buildRuleLabel(ctx: RuleBuildContext): string {
  const fromApi = readStructuredRuleFromApi(ctx.apiConstraint);
  if (fromApi?.ruleLabel) return fromApi.ruleLabel;

  const staticDef = STATIC_RULES[ctx.metaKey] ?? STATIC_RULES[ctx.entry.id];
  const catalogRule =
    ctx.draft != null ? formatCatalogHardRuleFromDraft(ctx.metaKey, ctx) : null;
  if (catalogRule) return catalogRule;
  if (staticDef?.ruleTemplate) {
    const dynamic = staticDef.ruleTemplate(ctx);
    if (dynamic) return dynamic;
  }
  if (staticDef?.ruleLabel) return staticDef.ruleLabel;

  const enforcementDefault = resolveEnforcementRuleLabelDefault(ctx.metaKey);
  if (enforcementDefault) return enforcementDefault;

  if (ctx.apiConstraint?.description?.trim()) return ctx.apiConstraint.description.trim();
  if (ctx.entry.description?.trim()) return ctx.entry.description.trim();
  if (ctx.entry.value?.trim()) return ctx.entry.value.trim();
  return ctx.entry.label;
}

function violationLabelFromContractMeta(
  contractMeta?: TripConstraint['contractMeta'],
): string | undefined {
  if (contractMeta?.violationResultLabel?.trim()) return contractMeta.violationResultLabel.trim();
  if (contractMeta?.violationResult === 'BLOCK') return '阻断执行';
  if (contractMeta?.violationResult === 'CONFIRM') return '需确认后调整';
  return undefined;
}

export function buildHardConstraintMetadata(input: {
  entry: ConstraintListEntry;
  apiConstraint?: TripConstraint | null;
  draft?: ConstraintEditorDraft | null;
}): HardConstraintMetadata {
  const { entry, apiConstraint, draft } = input;
  const contractMeta = apiConstraint?.contractMeta;
  const enabledFromSummary = contractMeta?.enabledSummary?.startsWith('已停用') ? false : undefined;
  const enabled =
    enabledFromSummary ??
    (apiConstraint?.enabled !== false && draft?.enabled !== false);
  const displayName = apiConstraint?.name?.trim() || entry.label;
  const metaKey = resolveHardConstraintMetaKey(entry, apiConstraint);
  const ctx: RuleBuildContext = { entry, apiConstraint, draft, metaKey };

  const scopeBinding = draft?.scopeBinding
    ? draft.scopeBinding
    : parseScopeBindingFromConstraint(apiConstraint);
  const scopeLabel =
    contractMeta?.scopeLabel?.trim() ||
    formatConstraintScopeSummary(scopeBinding) ||
    formatScopeLabel(apiConstraint?.scope) ||
    (draft ? formatEditorScope(draft.scope) : '整趟行程');
  const scopeRows = buildConstraintScopeDisplayRows(scopeBinding, {
    severityLabel: severityLabelFromDraftType(draft?.type ?? 'HARD'),
  });

  const staticDef = STATIC_RULES[metaKey] ?? STATIC_RULES[entry.id];
  const enforcementSpec = resolveHardEnforcementSpecForConstraint(
    apiConstraint ?? { id: entry.id },
  );
  const fromApi = readStructuredRuleFromApi(apiConstraint);
  const draftRule =
    draft != null ? formatCatalogHardRuleFromDraft(metaKey, ctx) : null;
  const ruleLabel =
    draftRule ??
    contractMeta?.judgmentRule?.trim() ??
    buildRuleLabel(ctx);
  const violationLabel =
    violationLabelFromContractMeta(contractMeta) ??
    fromApi?.violationLabel ??
    resolveEnforcementViolationLabel(metaKey) ??
    violationForHardConstraint(
      entry,
      staticDef?.violationLabel ?? enforcementSpec?.violationResultLabel,
    );

  return {
    enabledLabel:
      contractMeta?.enabledSummary?.trim() ??
      (enabled ? `已启用：${displayName}` : `已停用：${displayName}`),
    scopeLabel,
    scopeRows,
    ruleLabel,
    violationLabel,
  };
}

export function enrichListEntryWithMetadata(
  entry: ConstraintListEntry,
  apiConstraint?: TripConstraint | null,
  draft?: ConstraintEditorDraft | null,
): ConstraintListEntry {
  if (entry.kind !== 'hard') return entry;
  const meta = buildHardConstraintMetadata({ entry, apiConstraint, draft });
  return {
    ...entry,
    metadata: meta,
    category: entry.category ?? apiConstraint?.category,
  };
}

/** 保证硬约束列表项始终带合同元数据（GET / BFF / 本地合并后调用） */
export function ensureHardConstraintMetadataOnEntry(
  entry: ConstraintListEntry,
  apiConstraint?: TripConstraint | null,
  draft?: ConstraintEditorDraft | null,
): ConstraintListEntry {
  if (entry.kind !== 'hard') return entry;
  return enrichListEntryWithMetadata(entry, apiConstraint, draft);
}

export function ensureHardConstraintMetadataOnEntries(
  entries: ConstraintListEntry[],
  apiItems?: TripConstraint[] | null,
): ConstraintListEntry[] {
  if (!entries.length) return entries;
  const apiByKey = new Map<string, TripConstraint>();
  for (const item of apiItems ?? []) {
    apiByKey.set(item.id, item);
    apiByKey.set(apiConstraintIdToUi(item.id), item);
  }
  return entries.map((entry) => {
    if (entry.kind !== 'hard') return entry;
    const api =
      apiByKey.get(entry.id) ??
      apiByKey.get(uiConstraintIdToApi(entry.id));
    return ensureHardConstraintMetadataOnEntry(entry, api ?? null);
  });
}

export function formatHardConstraintListHint(metadata: HardConstraintMetadata): string {
  return `${metadata.enabledLabel} · ${metadata.scopeLabel}`;
}
