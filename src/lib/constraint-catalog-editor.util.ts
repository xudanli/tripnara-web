import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import type { CatalogHardTemplateId } from '@/lib/constraint-catalog-template-ids';
import { isCatalogHardTemplate } from '@/lib/constraint-catalog-template-ids';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { TripConstraint } from '@/types/trip-constraints';
import { formatCurrency } from '@/utils/format';
import { coerceDisplayText } from '@/lib/coerce-display-text.util';

export type CatalogHardFieldKind =
  | 'time'
  | 'hours'
  | 'currency'
  | 'km'
  | 'count'
  | 'toggle'
  | 'toggle_with_notes';

export interface CatalogHardEditorSpec {
  templateId: CatalogHardTemplateId;
  fieldKind: CatalogHardFieldKind;
  valueLabel: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  notesPlaceholder?: string;
}

const CATALOG_HARD_EDITOR_SPECS: Record<CatalogHardTemplateId, CatalogHardEditorSpec> = {
  earliest_departure: {
    templateId: 'earliest_departure',
    fieldKind: 'time',
    valueLabel: '最早出发时刻',
    helperText: '每日实际出发/活动开始不得早于此时间。',
  },
  latest_end: {
    templateId: 'latest_end',
    fieldKind: 'time',
    valueLabel: '最晚结束时刻',
    helperText: '每日行程结束不得晚于此时间。',
  },
  max_daily_activity: {
    templateId: 'max_daily_activity',
    fieldKind: 'hours',
    valueLabel: '单日活动时长上限',
    helperText: '含游览、徒步、体验等非驾驶活动总时长。',
    min: 1,
    max: 16,
    step: 0.5,
  },
  required_rest: {
    templateId: 'required_rest',
    fieldKind: 'hours',
    valueLabel: '必须保留休息时长',
    helperText: '每日须保留的休息/缓冲时间（小时）。',
    min: 0.5,
    max: 8,
    step: 0.5,
  },
  fixed_appointments: {
    templateId: 'fixed_appointments',
    fieldKind: 'count',
    valueLabel: '固定预约数量',
    helperText: '不可挪动的航班、预约、入住等固定节点数量（详细时间在日程中维护）。',
    min: 0,
    max: 20,
    step: 1,
  },
  activity_budget: {
    templateId: 'activity_budget',
    fieldKind: 'currency',
    valueLabel: '单项活动费用上限',
    helperText: '单个活动/体验花费不得超过此金额。',
    min: 0,
    step: 50,
  },
  budget_overrun_tolerance: {
    templateId: 'budget_overrun_tolerance',
    fieldKind: 'currency',
    valueLabel: '超预算容忍额度',
    helperText: '允许超出总预算的最大金额；与总预算上限配合使用。',
    min: 0,
    step: 100,
  },
  elderly_walk_limit: {
    templateId: 'elderly_walk_limit',
    fieldKind: 'km',
    valueLabel: '老人单日步行上限',
    helperText: '含景点内步行与换乘步行距离估算。',
    min: 0.5,
    max: 20,
    step: 0.5,
  },
  child_nap_time: {
    templateId: 'child_nap_time',
    fieldKind: 'time',
    valueLabel: '午睡开始时间',
    helperText: '该时刻起至后续 1–2 小时内不得安排高强度活动。',
  },
  accessibility: {
    templateId: 'accessibility',
    fieldKind: 'toggle_with_notes',
    valueLabel: '无障碍要求',
    helperText: '行程须满足轮椅、坡道、电梯等无障碍通行要求。',
    notesPlaceholder: '例如：需轮椅通道、避免长台阶、优先无障碍卫生间…',
  },
  motion_sickness: {
    templateId: 'motion_sickness',
    fieldKind: 'toggle_with_notes',
    valueLabel: '晕车 / 恐高限制',
    helperText: '避免引发晕车、恐高等不适的安排。',
    notesPlaceholder: '例如：避免连续盘山路、不安排过高观景台…',
  },
  dietary_restrictions: {
    templateId: 'dietary_restrictions',
    fieldKind: 'toggle_with_notes',
    valueLabel: '饮食禁忌',
    helperText: '餐饮安排须避开设定饮食禁忌。',
    notesPlaceholder: '例如：素食、无麸质、不吃海鲜…',
  },
  no_unpaved_road: {
    templateId: 'no_unpaved_road',
    fieldKind: 'toggle',
    valueLabel: '不走未铺装道路',
    helperText: '不得安排 F 路、碎石路等未铺装或高风险路况路段。',
  },
  no_bad_weather: {
    templateId: 'no_bad_weather',
    fieldKind: 'toggle',
    valueLabel: '不在恶劣天气出行',
    helperText: '大风、暴雪等恶劣条件下不得安排受影响出行。',
  },
  no_high_risk_activity: {
    templateId: 'no_high_risk_activity',
    fieldKind: 'toggle',
    valueLabel: '不参加高风险活动',
    helperText: '不得安排冰川徒步、未评估探险等高风险活动。',
  },
  no_unverified_route: {
    templateId: 'no_unverified_route',
    fieldKind: 'toggle',
    valueLabel: '不接受无官方证据路线',
    helperText: '不接受缺乏官方验证或封闭公告的路线方案。',
  },
};

export function resolveConstraintEditorTemplateId(
  entryId: string,
  apiConstraint?: TripConstraint | null,
): string {
  if (isCatalogHardTemplate(entryId)) return entryId;
  const fromApiId = apiConstraintIdToUi(entryId);
  if (isCatalogHardTemplate(fromApiId)) return fromApiId;
  const templateId = apiConstraint?.source?.templateId;
  if (templateId && isCatalogHardTemplate(templateId)) return templateId;
  return entryId;
}

export function resolveCatalogHardEditorSpec(
  templateId: string,
): CatalogHardEditorSpec | null {
  if (!isCatalogHardTemplate(templateId)) return null;
  return CATALOG_HARD_EDITOR_SPECS[templateId] ?? null;
}

export function decimalHoursToTimeString(value: number): string {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeStringToDecimalHours(time: string): number {
  const [hRaw, mRaw] = time.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h)) return 0;
  return h + (Number.isFinite(m) ? m : 0) / 60;
}

function readTimeFromValue(value: unknown): number | null {
  if (value && typeof value === 'object') {
    const time = (value as Record<string, unknown>).time;
    if (typeof time === 'string' && time.includes(':')) {
      return timeStringToDecimalHours(time);
    }
  }
  return null;
}

function readHoursFromValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    for (const key of ['hours', 'maxHours', 'value']) {
      const n = v[key];
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
  }
  return null;
}

function readAmountFromValue(value: unknown): { amount: number; currency?: string } | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { amount: value };
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const amount =
      typeof v.amount === 'number'
        ? v.amount
        : typeof v.value === 'number'
          ? v.value
          : null;
    if (amount != null) {
      return {
        amount,
        currency: typeof v.currency === 'string' ? v.currency : undefined,
      };
    }
  }
  return null;
}

function readKmFromValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    for (const key of ['maxKm', 'km', 'value']) {
      const n = v[key];
      if (typeof n === 'number' && Number.isFinite(n)) return n;
    }
  }
  return null;
}

function readCountFromValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const count = (value as Record<string, unknown>).count;
    if (typeof count === 'number' && Number.isFinite(count)) return count;
  }
  return null;
}

function readEnabledFromValue(value: unknown, constraintEnabled?: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object') {
    const enabled = (value as Record<string, unknown>).enabled;
    if (typeof enabled === 'boolean') return enabled;
  }
  return constraintEnabled !== false;
}

function readNotesFromValue(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    for (const key of ['notes', 'description', 'detail']) {
      const text = v[key];
      if (typeof text === 'string' && text.trim()) return text.trim();
    }
  }
  return undefined;
}

/** 从 API 约束 + 模板默认值合并编辑草稿字段 */
export function hydrateCatalogHardDraftFromApi(
  templateId: CatalogHardTemplateId,
  apiConstraint: TripConstraint | null | undefined,
  defaults: Partial<ConstraintEditorDraft>,
): Partial<ConstraintEditorDraft> {
  const spec = CATALOG_HARD_EDITOR_SPECS[templateId];
  const value = apiConstraint?.value;
  const patch: Partial<ConstraintEditorDraft> = {
    ...defaults,
    enabled: apiConstraint?.enabled !== false,
    priority: apiConstraint?.priority ?? defaults.priority ?? 7,
    locked: apiConstraint?.locked ?? defaults.locked ?? false,
    reason: readNotesFromValue(value) || defaults.reason || '',
  };

  switch (spec.fieldKind) {
    case 'time': {
      const time = readTimeFromValue(value);
      patch.targetValue = time ?? defaults.targetValue ?? 8;
      patch.targetUnit = 'hour';
      break;
    }
    case 'hours': {
      patch.targetValue = readHoursFromValue(value) ?? defaults.targetValue ?? 0;
      patch.targetUnit = 'hour';
      break;
    }
    case 'currency': {
      const amount = readAmountFromValue(value);
      patch.targetValue = amount?.amount ?? defaults.targetValue ?? 0;
      patch.targetUnit = 'currency';
      patch.currency = amount?.currency ?? apiConstraint?.unit ?? defaults.currency ?? 'CNY';
      break;
    }
    case 'km': {
      patch.targetValue = readKmFromValue(value) ?? defaults.targetValue ?? 0;
      patch.targetUnit = 'km';
      break;
    }
    case 'count': {
      patch.targetValue = readCountFromValue(value) ?? defaults.targetValue ?? 0;
      patch.targetUnit = 'day';
      break;
    }
    case 'toggle':
    case 'toggle_with_notes': {
      patch.enabled = readEnabledFromValue(value, apiConstraint?.enabled);
      patch.targetValue = patch.enabled ? 1 : 0;
      patch.targetUnit = 'hour';
      break;
    }
    default:
      break;
  }

  return patch;
}

export function isCatalogHardToggleTemplate(templateId: string): boolean {
  const spec = resolveCatalogHardEditorSpec(templateId);
  return spec?.fieldKind === 'toggle' || spec?.fieldKind === 'toggle_with_notes';
}

/** catalog 硬约束 · 列表项展示值（保存/暂存后局部更新） */
export function formatCatalogHardListValueFromDraft(
  draft: Pick<ConstraintEditorDraft, 'id' | 'targetValue' | 'currency' | 'enabled'>,
): string | undefined {
  if (!isCatalogHardTemplate(draft.id)) return undefined;
  const spec = resolveCatalogHardEditorSpec(draft.id);
  if (!spec) return undefined;
  switch (spec.fieldKind) {
    case 'time':
      return decimalHoursToTimeString(draft.targetValue);
    case 'hours':
      return `${draft.targetValue} 小时`;
    case 'currency':
      return formatCurrency(draft.targetValue, draft.currency ?? 'CNY');
    case 'km':
      return `${draft.targetValue} km`;
    case 'count':
      return `${Math.round(draft.targetValue)} 个`;
    case 'toggle':
    case 'toggle_with_notes':
      return draft.enabled !== false ? '已启用' : '已停用';
    default:
      return undefined;
  }
}

function readTimeDecimalFromConstraint(
  apiConstraint?: TripConstraint | null,
  draft?: ConstraintEditorDraft | null,
): number | null {
  if (draft?.targetValue != null && Number.isFinite(draft.targetValue)) return draft.targetValue;
  return readTimeFromValue(apiConstraint?.value);
}

/** catalog 硬约束 · 判定规则文案（含时间类动态值） */
export function formatCatalogHardRuleFromDraft(
  templateId: string,
  ctx: { draft?: ConstraintEditorDraft | null; apiConstraint?: TripConstraint | null },
): string | null {
  if (!isCatalogHardTemplate(templateId)) return null;
  const spec = resolveCatalogHardEditorSpec(templateId);
  if (!spec) return null;
  switch (templateId) {
    case 'earliest_departure': {
      const hours = readTimeDecimalFromConstraint(ctx.apiConstraint, ctx.draft);
      return hours != null ? `每日出发不早于 ${decimalHoursToTimeString(hours)}` : null;
    }
    case 'latest_end': {
      const hours = readTimeDecimalFromConstraint(ctx.apiConstraint, ctx.draft);
      return hours != null ? `每日结束不晚于 ${decimalHoursToTimeString(hours)}` : null;
    }
    case 'child_nap_time': {
      const hours = readTimeDecimalFromConstraint(ctx.apiConstraint, ctx.draft);
      return hours != null
        ? `儿童午睡时段 ${decimalHoursToTimeString(hours)} 内不得安排高强度活动`
        : null;
    }
    case 'max_daily_activity': {
      const hours =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? ctx.draft.targetValue
          : readHoursFromValue(ctx.apiConstraint?.value);
      return hours != null ? `单日活动总时长不超过 ${hours} 小时` : null;
    }
    case 'required_rest': {
      const hours =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? ctx.draft.targetValue
          : readHoursFromValue(ctx.apiConstraint?.value);
      return hours != null ? `每日须保留 ${hours} 小时休息/缓冲` : null;
    }
    case 'elderly_walk_limit': {
      const km =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? ctx.draft.targetValue
          : readKmFromValue(ctx.apiConstraint?.value);
      return km != null ? `老人单日步行距离不超过 ${km} km` : null;
    }
    case 'activity_budget': {
      const fromDraft =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? { amount: ctx.draft.targetValue, currency: ctx.draft.currency }
          : null;
      const amount = fromDraft ?? readAmountFromValue(ctx.apiConstraint?.value);
      const currency = amount?.currency ?? ctx.draft?.currency ?? 'CNY';
      return amount != null ? `单项活动花费不超过 ${amount.amount} ${currency}` : null;
    }
    case 'budget_overrun_tolerance': {
      const fromDraft =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? { amount: ctx.draft.targetValue, currency: ctx.draft.currency }
          : null;
      const amount = fromDraft ?? readAmountFromValue(ctx.apiConstraint?.value);
      const currency = amount?.currency ?? ctx.draft?.currency ?? 'CNY';
      return amount != null ? `超预算幅度不得超过 ${amount.amount} ${currency}` : null;
    }
    case 'fixed_appointments': {
      const count =
        ctx.draft?.targetValue != null && Number.isFinite(ctx.draft.targetValue)
          ? Math.round(ctx.draft.targetValue)
          : readCountFromValue(ctx.apiConstraint?.value);
      return count != null ? `固定预约节点 ${count} 个不可挪动` : null;
    }
    default:
      return null;
  }
}

function formatPreviewUnitSuffix(unit?: string): string | undefined {
  if (!unit?.trim()) return undefined;
  switch (unit.trim().toLowerCase()) {
    case 'hour':
    case 'hours':
      return '小时';
    case 'km':
      return 'km';
    case 'star':
      return '星';
    case 'day':
      return '天';
    case 'currency':
      return undefined;
    default:
      return unit;
  }
}

/** preview-impact · 约束变化 before/after 展示（API 可能返回 time 对象） */
export function formatConstraintPreviewChangeValue(
  value: unknown,
  unit?: string,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'boolean') {
    return value ? '已启用' : '未启用';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalizedUnit = unit?.trim().toLowerCase();
    if (normalizedUnit === 'time') {
      return decimalHoursToTimeString(value);
    }
    if (normalizedUnit === 'hour' || normalizedUnit === 'hours') {
      return `${value} 小时`;
    }
    const suffix = formatPreviewUnitSuffix(unit);
    return suffix ? `${value} ${suffix}` : String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.time === 'string' && record.time.trim()) {
      return record.time.trim();
    }
    if (typeof record.hour === 'number' && Number.isFinite(record.hour)) {
      const minute = typeof record.minute === 'number' && Number.isFinite(record.minute) ? record.minute : 0;
      return `${String(record.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    const hours = readHoursFromValue(value);
    if (hours != null) return `${hours} 小时`;
    const amount = readAmountFromValue(value);
    if (amount != null) {
      return amount.currency
        ? formatCurrency(amount.amount, amount.currency)
        : String(amount.amount);
    }
    const km = readKmFromValue(value);
    if (km != null) return `${km} km`;
    const count = readCountFromValue(value);
    if (count != null) return `${count} 个`;
    if (typeof record.enabled === 'boolean') {
      return record.enabled ? '已启用' : '未启用';
    }
    return coerceDisplayText(value);
  }
  return coerceDisplayText(value);
}
