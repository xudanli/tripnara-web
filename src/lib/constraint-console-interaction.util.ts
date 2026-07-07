/**
 * 约束控制台 · 交互 SSOT（弹窗 vs 详情 vs 内联）
 *
 * | primarySurface | 含义 | 典型组件 |
 * |----------------|------|----------|
 * | inline_slider | 列表内联 | Slider（软偏好） |
 * | modal_catalog | 弹窗 · catalog PATCH | ConstraintItemEditDialog + saveCatalogHardConstraint |
 * | modal_generic | 弹窗 · 通用/legacy 保存 | ConstraintItemEditDialog |
 * | modal_legacy | 专用 legacy 弹窗 | Planning*ConstraintsDialog |
 * | detail_contract | 右栏 contract 编辑 | ContractSectionDetailPanel |
 * | detail_readonly | 中/右栏只读 | DestinationRulesSectionPanel / ConstraintExternalDetailPanel |
 * | detail_travel_goals | 右栏排序 | TravelGoalsDetailPanel |
 * | detail_conflict | 只读 + 跳转处置 | ContractSectionDetailPanel + 决策中心 |
 * | none | 不可编辑 | — |
 */
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import {
  CATALOG_HARD_TEMPLATE_IDS,
  CATALOG_SOFT_TEMPLATE_IDS,
  isCatalogHardTemplate,
} from '@/lib/constraint-catalog-template-ids';
import {
  isOfficialRuleConstraint,
  isWorldFeasibilityConstraint,
} from '@/lib/constraint-console-partition.util';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripConstraintsSectionKey } from '@/types/trip-constraints';

export type ConstraintInteractionSurface =
  | 'inline_slider'
  | 'modal_catalog'
  | 'modal_generic'
  | 'modal_legacy'
  | 'detail_contract'
  | 'detail_readonly'
  | 'detail_travel_goals'
  | 'detail_conflict'
  | 'none';

export interface ConstraintInteractionSpec {
  /** 模板 / 列表项 id（UI id） */
  id: string;
  label: string;
  sectionKey: TripConstraintsSectionKey | 'item';
  primarySurface: ConstraintInteractionSurface;
  /** 列表行「编辑」铅笔按钮 */
  listEditButton: boolean;
  /** 软偏好列表内联滑块 */
  inlineSlider: boolean;
  /** 选中后在右栏展示影响预览 */
  showImpactPreview: boolean;
  /** 专用 legacy 弹窗 key（AddConstraint / 摘要卡片入口） */
  legacyEditorKey?: ConstraintPendingKey;
  /** 实现入口（组件 / API） */
  entryComponent: string;
  notes?: string;
}

/** P1 enforce · 改值后应看影响预览 */
const ENFORCE_HARD_IDS = new Set(['daily_drive', 'no_night_drive', 'budget']);

const LEGACY_MODAL_IDS: Record<string, ConstraintPendingKey> = {
  time_range: 'time_range',
  budget: 'budget',
  travelers: 'travelers',
  transport: 'transport',
};

function catalogHardSpec(id: string, label: string, notes?: string): ConstraintInteractionSpec {
  return {
    id,
    label,
    sectionKey: 'hard_must_satisfy',
    primarySurface: 'modal_catalog',
    listEditButton: true,
    inlineSlider: false,
    showImpactPreview: true,
    entryComponent: 'ConstraintItemEditDialog → saveCatalogHardConstraint (PATCH)',
    notes,
  };
}

function legacyHardSpec(
  id: string,
  label: string,
  options?: {
    legacyEditorKey?: ConstraintPendingKey;
    primarySurface?: ConstraintInteractionSurface;
    entryComponent?: string;
    showImpactPreview?: boolean;
    listEditButton?: boolean;
    notes?: string;
  },
): ConstraintInteractionSpec {
  const legacyKey = options?.legacyEditorKey ?? LEGACY_MODAL_IDS[id];
  return {
    id,
    label,
    sectionKey: 'hard_must_satisfy',
    primarySurface:
      options?.primarySurface ?? (legacyKey ? 'modal_legacy' : 'modal_generic'),
    listEditButton: options?.listEditButton ?? true,
    inlineSlider: false,
    showImpactPreview: options?.showImpactPreview ?? ENFORCE_HARD_IDS.has(id),
    legacyEditorKey: legacyKey,
    entryComponent:
      options?.entryComponent ??
      (legacyKey
        ? `Planning*ConstraintsDialog 或 ConstraintItemEditDialog`
        : 'ConstraintItemEditDialog'),
    notes: options?.notes,
  };
}

/** 硬约束 catalog（POST + PATCH）— 与 BFF registry 对齐 */
export const CATALOG_HARD_INTERACTIONS: ConstraintInteractionSpec[] = CATALOG_HARD_TEMPLATE_IDS.map(
  (id) => {
    const labels: Record<string, string> = {
      earliest_departure: '最早出发时间',
      latest_end: '最晚结束时间',
      max_daily_activity: '每日最大活动时长',
      required_rest: '必须保留的休息时间',
      fixed_appointments: '固定航班 / 预约 / 入住',
      activity_budget: '单项活动上限',
      budget_overrun_tolerance: '超预算容忍额度',
      elderly_walk_limit: '老人步行上限',
      child_nap_time: '儿童午睡时间',
      accessibility: '无障碍要求',
      motion_sickness: '晕车 / 恐高限制',
      dietary_restrictions: '饮食禁忌',
      no_unpaved_road: '不走未铺装道路',
      no_bad_weather: '不在恶劣天气出行',
      no_high_risk_activity: '不参加高风险活动',
      no_unverified_route: '不接受无官方证据路线',
    };
    return catalogHardSpec(id, labels[id] ?? id);
  },
);

/** Legacy / 结构型硬约束 */
export const LEGACY_HARD_INTERACTIONS: ConstraintInteractionSpec[] = [
  legacyHardSpec('time_range', '总行程时长', {
    entryComponent: 'ConstraintItemEditDialog → saveConstraintTimeRange',
  }),
  legacyHardSpec('budget', '总预算上限', {
    entryComponent: 'ConstraintItemEditDialog → tripBudgetApi.putIntent',
    showImpactPreview: true,
  }),
  legacyHardSpec('travelers', '出行人数', { legacyEditorKey: 'travelers' }),
  legacyHardSpec('transport', '基础交通方式', { legacyEditorKey: 'transport' }),
  legacyHardSpec('daily_drive', '每日最大驾驶时长', {
    entryComponent: 'ConstraintItemEditDialog → saveConstraintDailyDrive',
    showImpactPreview: true,
  }),
  legacyHardSpec('no_night_drive', '不夜间驾驶', {
    entryComponent: 'ConstraintItemEditDialog → PATCH c_no_night_drive',
    showImpactPreview: true,
  }),
  legacyHardSpec('max_segment_distance', '连续驾驶上限', {
    entryComponent: 'ConstraintItemEditDialog → PATCH c_max_segment_distance',
    notes: '含 warn 阈值时在详情右栏一并查看',
  }),
  legacyHardSpec('accommodation', '单晚住宿上限', {
    entryComponent: 'ConstraintItemEditDialog → saveConstraintAccommodation',
  }),
  legacyHardSpec('must_go', '必去地点', {
    entryComponent: 'ConstraintItemEditDialog → tripsApi.updateIntent(mustPlaces)',
    showImpactPreview: true,
    notes: '结构型 · 建议选中后在右栏看影响再保存',
  }),
  legacyHardSpec('road_restrictions', '道路开放限制', {
    primarySurface: 'detail_readonly',
    listEditButton: false,
    entryComponent: 'DestinationRulesSectionPanel / world 链路',
    notes: '系统监测 · 非用户 PATCH',
  }),
];

/** 软偏好 */
export const SOFT_INTERACTIONS: ConstraintInteractionSpec[] = [
  {
    id: 'allow_budget_overrun',
    label: '允许临时超预算',
    sectionKey: 'soft_prefer',
    primarySurface: 'modal_catalog',
    listEditButton: false,
    inlineSlider: true,
    showImpactPreview: false,
    entryComponent: 'AddConstraintDialog → POST SOFT · 列表 Slider 调优先级',
  },
  ...[
    'lunch_time_window',
    'max_major_pois_per_day',
    'minimize_hotel_changes',
    'daily_free_time',
    'avoid_early',
    'avoid_backtracking',
    'prefer_nature_scenery',
    'less_shopping',
    'sunset_photography',
    'budget_soft',
    'attractions_over_shopping',
    'aurora_photo',
    'prefer_local_food',
    'avoid_crowds',
    'elderly_rest',
  ].map(
    (id): ConstraintInteractionSpec => ({
      id,
      label: id,
      sectionKey: 'soft_prefer',
      primarySurface: 'inline_slider',
      listEditButton: false,
      inlineSlider: true,
      showImpactPreview: false,
      entryComponent: 'ConstraintConsoleListSidebar Slider → updateSoftConstraintPriority',
    }),
  ),
];

/** 7+2 分区（无单条 constraint 卡片） */
export const SECTION_INTERACTIONS: ConstraintInteractionSpec[] = [
  {
    id: '__travel_goals__',
    label: '旅行目标',
    sectionKey: 'travel_objectives',
    primarySurface: 'detail_travel_goals',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: false,
    entryComponent: 'TravelGoalsDetailPanel → PATCH contract.objectives',
  },
  {
    id: 'team_members',
    label: '团队成员',
    sectionKey: 'team_members',
    primarySurface: 'detail_contract',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: false,
    entryComponent: 'ContractSectionDetailPanel + 协作中心外链',
  },
  {
    id: 'change_strategy',
    label: '风险与变化策略',
    sectionKey: 'change_strategy',
    primarySurface: 'detail_contract',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: false,
    entryComponent: 'ContractSectionDetailPanel → PATCH contract.changeStrategy',
  },
  {
    id: 'automation',
    label: 'AI 自动执行',
    sectionKey: 'automation',
    primarySurface: 'detail_contract',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: false,
    entryComponent: 'ContractSectionDetailPanel · 只读摘要 → 跳转 AI 授权中心',
    notes: '档位与 actionOverrides 在 /trips/:id/automation 维护',
  },
  {
    id: 'conflicts_and_impact',
    label: '冲突与影响',
    sectionKey: 'conflicts_and_impact',
    primarySurface: 'detail_conflict',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: true,
    entryComponent: 'ContractSectionDetailPanel · 跳转决策中心 / 可执行性报告',
    notes: '只读汇总 · 不在此 PATCH 单条 constraint',
  },
  {
    id: 'readonly_official',
    label: '目的地规则',
    sectionKey: 'readonly_official',
    primarySurface: 'detail_readonly',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: true,
    entryComponent: 'ConstraintExternalDetailPanel · OFFICIAL_RULE 只读',
  },
  {
    id: 'readonly_world',
    label: '实时世界状态',
    sectionKey: 'readonly_world',
    primarySurface: 'detail_readonly',
    listEditButton: false,
    inlineSlider: false,
    showImpactPreview: true,
    entryComponent: 'ConstraintExternalDetailPanel · 刷新验证',
  },
];

const interactionById = new Map<string, ConstraintInteractionSpec>();

for (const row of [
  ...CATALOG_HARD_INTERACTIONS,
  ...LEGACY_HARD_INTERACTIONS,
  ...SOFT_INTERACTIONS,
  ...SECTION_INTERACTIONS,
]) {
  interactionById.set(row.id, row);
}

export const CONSTRAINT_INTERACTION_REGISTRY: ConstraintInteractionSpec[] = [
  ...CATALOG_HARD_INTERACTIONS,
  ...LEGACY_HARD_INTERACTIONS,
  ...SOFT_INTERACTIONS,
  ...SECTION_INTERACTIONS,
];

export function resolveConstraintInteractionId(entry: Pick<ConstraintListEntry, 'id' | 'kind'>): string {
  return apiConstraintIdToUi(entry.id);
}

export function resolveConstraintInteractionSpec(
  input: Pick<ConstraintListEntry, 'id' | 'kind' | 'sourceType'> | { id: string; kind?: ConstraintListEntry['kind'] },
): ConstraintInteractionSpec | null {
  const uiId = resolveConstraintInteractionId(input as ConstraintListEntry);

  if (isOfficialRuleConstraint(input as ConstraintListEntry)) {
    return interactionById.get('readonly_official') ?? null;
  }
  if (isWorldFeasibilityConstraint(input as ConstraintListEntry)) {
    return interactionById.get('readonly_world') ?? null;
  }

  const known = interactionById.get(uiId);
  if (known) return known;

  if (input.kind === 'soft' || uiId.startsWith('c_custom_') || uiId.startsWith('custom_')) {
    return {
      id: uiId,
      label: uiId,
      sectionKey: 'soft_prefer',
      primarySurface: 'inline_slider',
      listEditButton: false,
      inlineSlider: true,
      showImpactPreview: false,
      entryComponent: 'ConstraintConsoleListSidebar Slider',
      notes: '自定义软偏好',
    };
  }

  if (input.kind === 'hard' && isCatalogHardTemplate(uiId)) {
    return catalogHardSpec(uiId, uiId);
  }

  if (input.kind === 'hard') {
    const patchable = !isOfficialRuleConstraint(input as ConstraintListEntry) && !entryLocked(input as ConstraintListEntry);
    return {
      id: uiId,
      label: uiId,
      sectionKey: 'hard_must_satisfy',
      primarySurface: 'modal_generic',
      listEditButton: patchable,
      inlineSlider: false,
      showImpactPreview: ENFORCE_HARD_IDS.has(uiId),
      entryComponent: 'ConstraintItemEditDialog',
    };
  }

  return null;
}

function entryLocked(entry: ConstraintListEntry): boolean {
  return entry.readOnly === true || entry.locked === true;
}

/** 列表行是否显示「编辑」按钮 */
export function shouldShowListEditButton(entry: ConstraintListEntry): boolean {
  if (isOfficialRuleConstraint(entry) || entryLocked(entry)) return false;
  if (entry.kind === 'external') return false;
  const spec = resolveConstraintInteractionSpec(entry);
  if (spec) return spec.listEditButton;
  return entry.kind === 'hard';
}

/** 软偏好是否用内联 Slider（而非弹窗） */
export function shouldShowInlineSoftSlider(entry: ConstraintListEntry): boolean {
  if (entry.kind !== 'soft') return false;
  const spec = resolveConstraintInteractionSpec(entry);
  return spec?.inlineSlider ?? true;
}

/** 选中后右栏是否展示影响预览 */
export function shouldShowImpactPreviewForEntry(entry: ConstraintListEntry): boolean {
  const spec = resolveConstraintInteractionSpec(entry);
  if (spec) return spec.showImpactPreview;
  return entry.kind === 'hard';
}

export function resolveSectionInteractionSpec(
  sectionKey: TripConstraintsSectionKey | string,
): ConstraintInteractionSpec | null {
  return interactionById.get(sectionKey) ?? null;
}

export function isCatalogSoftTemplateId(id: string): boolean {
  return (CATALOG_SOFT_TEMPLATE_IDS as readonly string[]).includes(id);
}
