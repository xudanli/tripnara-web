import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BedDouble,
  Building2,
  Camera,
  Car,
  Clock,
  CloudRain,
  Leaf,
  MapPin,
  Moon,
  Mountain,
  Plane,
  Route,
  Shield,
  ShieldAlert,
  Sun,
  Users,
  Utensils,
  Wallet,
  Footprints,
  Baby,
  Accessibility,
  Ban,
} from 'lucide-react';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';
import type { PlanningConstraintsSummary } from '@/types/planning-constraints';

import type { PlanningConstraintsSummary } from '@/types/planning-constraints';
import {
  CATALOG_HARD_TEMPLATE_IDS,
  CATALOG_SOFT_TEMPLATE_IDS,
  isCatalogHardTemplate,
  isCatalogSoftTemplate,
  type CatalogHardTemplateId,
} from '@/lib/constraint-catalog-template-ids';

export type ConstraintTemplateKind = 'hard' | 'soft';

export {
  CATALOG_HARD_TEMPLATE_IDS,
  CATALOG_SOFT_TEMPLATE_IDS,
  isCatalogHardTemplate,
  isCatalogSoftTemplate,
  type CatalogHardTemplateId,
};

/** legacy 硬约束 — 仅 PATCH / 专用 API，禁止 catalog POST */
export function isLegacyHardConstraintTemplate(id: string): boolean {
  if (isCatalogHardTemplate(id)) return false;
  const template = CONSTRAINT_TEMPLATES.find((t) => t.id === id && t.kind === 'hard');
  return Boolean(template);
}

/** 添加约束 · 硬约束分组（与侧栏 hard 分组对齐） */
export type HardConstraintTemplateCategory = 'TIME' | 'BUDGET' | 'MEMBER' | 'RISK' | 'PLACE';

export interface ConstraintTemplate {
  id: string;
  kind: ConstraintTemplateKind;
  label: string;
  description: string;
  icon: LucideIcon;
  /** 硬约束 catalog 分组 */
  category?: HardConstraintTemplateCategory;
  requiresSelfDrive?: boolean;
  /** 走原有聚焦弹窗，不进三栏控制台 */
  legacyKey?: ConstraintPendingKey;
  /** 软偏好默认重要程度 */
  defaultPriority?: import('./constraint-console-view.util').SoftPreferencePriority;
}

const HARD_CATEGORY_LABELS: Record<HardConstraintTemplateCategory, string> = {
  TIME: '时间约束',
  BUDGET: '预算约束',
  MEMBER: '人员约束',
  RISK: '风险约束',
  PLACE: '地点与交通',
};

const HARD_CATEGORY_ORDER: HardConstraintTemplateCategory[] = [
  'TIME',
  'BUDGET',
  'MEMBER',
  'RISK',
  'PLACE',
];

export const CONSTRAINT_TEMPLATES: ConstraintTemplate[] = [
  // —— 时间约束 ——
  {
    id: 'time_range',
    kind: 'hard',
    category: 'TIME',
    label: '总行程时长',
    description: '设置出发与返程日期，确定行程天数',
    icon: Clock,
  },
  {
    id: 'earliest_departure',
    kind: 'hard',
    category: 'TIME',
    label: '最早出发时间',
    description: '每日最早出发时间不早于设定时刻',
    icon: Sun,
  },
  {
    id: 'latest_end',
    kind: 'hard',
    category: 'TIME',
    label: '最晚结束时间',
    description: '每日结束时间不晚于设定时刻',
    icon: Moon,
  },
  {
    id: 'max_daily_activity',
    kind: 'hard',
    category: 'TIME',
    label: '每日最大活动时长',
    description: '限制单日活动总时长，避免过度疲劳',
    icon: Clock,
  },
  {
    id: 'daily_drive',
    kind: 'hard',
    category: 'TIME',
    label: '每日最大驾驶时长',
    description: '限制单日驾驶时长，保障舒适度',
    icon: Car,
    requiresSelfDrive: true,
  },
  {
    id: 'max_segment_distance',
    kind: 'hard',
    category: 'TIME',
    label: '连续驾驶上限',
    description: '单段连续驾驶距离不超过设定上限',
    icon: Route,
    requiresSelfDrive: true,
  },
  {
    id: 'required_rest',
    kind: 'hard',
    category: 'TIME',
    label: '必须保留的休息时间',
    description: '行程中须保留规定的休息与缓冲时段',
    icon: Clock,
  },
  {
    id: 'fixed_appointments',
    kind: 'hard',
    category: 'TIME',
    label: '固定航班 / 预约 / 入住',
    description: '固定航班、预约、入住时间不可被挪动',
    icon: Plane,
  },
  // —— 预算约束 ——
  {
    id: 'budget',
    kind: 'hard',
    category: 'BUDGET',
    label: '总预算上限',
    description: '设定总预算门控，超支项将被标记',
    icon: Wallet,
  },
  {
    id: 'accommodation',
    kind: 'hard',
    category: 'BUDGET',
    label: '单晚住宿上限',
    description: '单晚住宿标准或费用上限',
    icon: BedDouble,
  },
  {
    id: 'activity_budget',
    kind: 'hard',
    category: 'BUDGET',
    label: '单项活动上限',
    description: '单项活动花费不超过设定上限',
    icon: Wallet,
  },
  {
    id: 'allow_budget_overrun',
    kind: 'soft',
    label: '允许临时超预算',
    description: '是否允许在特殊情况下临时超出总预算',
    icon: Wallet,
  },
  {
    id: 'budget_overrun_tolerance',
    kind: 'hard',
    category: 'BUDGET',
    label: '超预算容忍额度',
    description: '允许超出总预算的最大幅度（百分比或金额）',
    icon: Wallet,
  },
  // —— 人员约束 ——
  {
    id: 'elderly_walk_limit',
    kind: 'hard',
    category: 'MEMBER',
    label: '老人步行上限',
    description: '老人单日步行距离不超过设定上限',
    icon: Footprints,
  },
  {
    id: 'child_nap_time',
    kind: 'hard',
    category: 'MEMBER',
    label: '儿童午睡时间',
    description: '午睡时段内不得安排高强度活动',
    icon: Baby,
  },
  {
    id: 'accessibility',
    kind: 'hard',
    category: 'MEMBER',
    label: '无障碍要求',
    description: '行程须满足轮椅、坡道等无障碍通行要求',
    icon: Accessibility,
  },
  {
    id: 'motion_sickness',
    kind: 'hard',
    category: 'MEMBER',
    label: '晕车 / 恐高限制',
    description: '避免引发晕车、恐高等不适的安排',
    icon: AlertTriangle,
  },
  {
    id: 'dietary_restrictions',
    kind: 'hard',
    category: 'MEMBER',
    label: '饮食禁忌',
    description: '餐饮安排须避开设定饮食禁忌',
    icon: Utensils,
  },
  {
    id: 'avoid_activity_type',
    kind: 'hard',
    category: 'MEMBER',
    label: '不参加某类活动',
    description: '不得安排成员声明不参加的活动类型',
    icon: Ban,
  },
  {
    id: 'travelers',
    kind: 'hard',
    category: 'MEMBER',
    label: '出行人数',
    description: '规划与预算按此人数计算',
    icon: Users,
    legacyKey: 'travelers',
  },
  // —— 风险约束 ——
  {
    id: 'no_night_drive',
    kind: 'hard',
    category: 'RISK',
    label: '不夜间驾驶',
    description: '日落后含缓冲时间内不得继续驾驶',
    icon: Moon,
    requiresSelfDrive: true,
  },
  {
    id: 'no_unpaved_road',
    kind: 'hard',
    category: 'RISK',
    label: '不走未铺装道路',
    description: '不得安排未铺装或高风险路况路段',
    icon: Route,
    requiresSelfDrive: true,
  },
  {
    id: 'no_bad_weather',
    kind: 'hard',
    category: 'RISK',
    label: '不在恶劣天气出行',
    description: '恶劣天气条件下不得安排受影响出行',
    icon: CloudRain,
  },
  {
    id: 'no_high_risk_activity',
    kind: 'hard',
    category: 'RISK',
    label: '不参加高风险活动',
    description: '不得安排高风险或未评估活动',
    icon: ShieldAlert,
  },
  {
    id: 'no_unverified_route',
    kind: 'hard',
    category: 'RISK',
    label: '不接受无官方证据路线',
    description: '不接受缺乏官方证据或验证的路线',
    icon: Shield,
  },
  {
    id: 'road_restrictions',
    kind: 'hard',
    category: 'RISK',
    label: '道路开放限制',
    description: 'F 路、季节性封路等通行约束（系统监测）',
    icon: Route,
    requiresSelfDrive: true,
  },
  // —— 地点 ——
  {
    id: 'must_go',
    kind: 'hard',
    category: 'PLACE',
    label: '必去地点',
    description: '锁定必须到访的 POI 或区域',
    icon: MapPin,
  },
  {
    id: 'transport',
    kind: 'hard',
    category: 'PLACE',
    label: '基础交通方式',
    description: '自驾、公共交通或混合出行',
    icon: Car,
    legacyKey: 'transport',
  },
  // —— 软偏好（可协商 · 尽量满足） ——
  {
    id: 'lunch_time_window',
    kind: 'soft',
    label: '午餐时间窗',
    description: '午餐尽量安排在 12:00–13:30，避免过晚影响下午行程',
    icon: Utensils,
    defaultPriority: '中',
  },
  {
    id: 'max_major_pois_per_day',
    kind: 'soft',
    label: '每日主要景点上限',
    description: '每天最好不超过 3 个主要景点，避免行程过满',
    icon: MapPin,
    defaultPriority: '中',
  },
  {
    id: 'minimize_hotel_changes',
    kind: 'soft',
    label: '少换酒店',
    description: '尽量连续住同一家酒店，减少打包与通勤成本',
    icon: BedDouble,
    defaultPriority: '高',
  },
  {
    id: 'daily_free_time',
    kind: 'soft',
    label: '每日自由时间',
    description: '每天保留约 1 小时自由时间，应对临时调整或休息',
    icon: Clock,
    defaultPriority: '中',
  },
  {
    id: 'avoid_early',
    kind: 'soft',
    label: '尽量避免早起',
    description: '控制连续早出发天数，优先安排合理出发时刻',
    icon: Sun,
    defaultPriority: '中',
  },
  {
    id: 'avoid_backtracking',
    kind: 'soft',
    label: '尽量不走回头路',
    description: '路线规划时减少折返与重复路段',
    icon: Route,
    defaultPriority: '中',
  },
  {
    id: 'prefer_nature_scenery',
    kind: 'soft',
    label: '多安排自然景观',
    description: '排程时倾向自然风光、观景点与户外体验',
    icon: Mountain,
    defaultPriority: '中',
  },
  {
    id: 'less_shopping',
    kind: 'soft',
    label: '少安排购物',
    description: '控制购物点数量与时长，把时间留给核心体验',
    icon: Ban,
    defaultPriority: '低',
  },
  {
    id: 'sunset_photography',
    kind: 'soft',
    label: '日落摄影',
    description: '在条件允许时优先预留日落拍摄时段与机位',
    icon: Camera,
    defaultPriority: '低',
  },
  {
    id: 'attractions_over_shopping',
    kind: 'soft',
    label: '体验优于购物',
    description: '多安排观光体验，少安排购物（与「多自然景观 / 少购物」同类）',
    icon: Camera,
    defaultPriority: '中',
  },
  {
    id: 'budget_soft',
    kind: 'soft',
    label: '控制预算',
    description: '尽量控制花费；与其他软约束冲突时可适度让步',
    icon: Wallet,
    defaultPriority: '高',
  },
  {
    id: 'allow_budget_overrun',
    kind: 'soft',
    label: '允许临时超预算',
    description: '是否允许在特殊情况下临时超出总预算（可协商）',
    icon: Wallet,
    defaultPriority: '中',
  },
  {
    id: 'elderly_rest',
    kind: 'soft',
    label: '老人下午需休息',
    description: '15:00 前安排休息或低强度活动',
    icon: Users,
    defaultPriority: '高',
  },
  {
    id: 'aurora_photo',
    kind: 'soft',
    label: '尽量拍摄极光',
    description: '在条件允许时优先安排极光观测',
    icon: Mountain,
    defaultPriority: '低',
  },
  {
    id: 'prefer_local_food',
    kind: 'soft',
    label: '优先当地美食',
    description: '排程时预留特色餐饮体验',
    icon: Utensils,
    defaultPriority: '中',
  },
  {
    id: 'avoid_crowds',
    kind: 'soft',
    label: '避开人潮',
    description: '倾向错峰或小众景点',
    icon: Leaf,
    defaultPriority: '中',
  },
];

export function getVisibleConstraintTemplates(
  trip: TripDetail | null | undefined,
): ConstraintTemplate[] {
  const selfDrive = isSelfDrivePlanningTrip(trip);
  return CONSTRAINT_TEMPLATES.filter((t) => !t.requiresSelfDrive || selfDrive);
}

export function splitConstraintTemplates(templates: ConstraintTemplate[]) {
  return {
    hard: templates.filter((t) => t.kind === 'hard'),
    soft: templates.filter((t) => t.kind === 'soft'),
  };
}

export interface HardConstraintTemplateGroup {
  category: HardConstraintTemplateCategory;
  label: string;
  items: ConstraintTemplate[];
}

export function groupHardConstraintTemplates(
  templates: ConstraintTemplate[],
): HardConstraintTemplateGroup[] {
  const hard = templates.filter((t) => t.kind === 'hard' && t.category);
  const buckets = new Map<HardConstraintTemplateCategory, ConstraintTemplate[]>();
  for (const template of hard) {
    const key = template.category!;
    const list = buckets.get(key) ?? [];
    list.push(template);
    buckets.set(key, list);
  }
  return HARD_CATEGORY_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map((key) => ({
    category: key,
    label: HARD_CATEGORY_LABELS[key],
    items: buckets.get(key) ?? [],
  }));
}

/** 模板 id → 控制台列表项 id（legacy 弹窗类除外） */
export function resolveTemplateSelection(
  template: ConstraintTemplate,
): { mode: 'console'; constraintId: string } | { mode: 'legacy'; key: ConstraintPendingKey } {
  if (template.legacyKey) {
    return { mode: 'legacy', key: template.legacyKey };
  }
  return { mode: 'console', constraintId: template.id };
}

export function shouldCatalogPostOnTemplatePick(template: ConstraintTemplate): boolean {
  if (template.kind === 'soft') return isCatalogSoftTemplate(template.id);
  if (template.kind === 'hard') return isCatalogHardTemplate(template.id);
  return false;
}

/** 添加弹窗 · 可多选批量 POST 的 catalog 模板（legacy / 需单条编辑的不含） */
export function isBatchAddableConstraintTemplate(template: ConstraintTemplate): boolean {
  if (template.legacyKey) return false;
  return shouldCatalogPostOnTemplatePick(template);
}

export function isSoftConstraintTemplateId(id: string): boolean {
  return CONSTRAINT_TEMPLATES.some((t) => t.kind === 'soft' && t.id === id);
}

export function isHardConstraintTemplateId(id: string): boolean {
  return CONSTRAINT_TEMPLATES.some((t) => t.kind === 'hard' && t.id === id);
}

export function getSoftConstraintTemplate(id: string): ConstraintTemplate | undefined {
  return CONSTRAINT_TEMPLATES.find((t) => t.kind === 'soft' && t.id === id);
}

export function getHardConstraintTemplate(id: string): ConstraintTemplate | undefined {
  const uiId = id.startsWith('c_tpl_') ? apiConstraintIdToUi(id) : id;
  return CONSTRAINT_TEMPLATES.find((t) => t.kind === 'hard' && t.id === uiId);
}

export function listSoftConstraintTemplates(
  trip: TripDetail | null | undefined,
): ConstraintTemplate[] {
  return getVisibleConstraintTemplates(trip).filter((t) => t.kind === 'soft');
}

/** 已配置 / 已启用的硬约束 UI id（添加对话框中隐藏） */
export function resolveConfiguredHardConstraintIds(input: {
  apiList?: TripConstraintsListResponse | null;
  summary?: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
}): string[] {
  const ids = new Set<string>();
  for (const item of input.apiList?.items ?? []) {
    if (item.type !== 'HARD' || item.status === 'DISABLED') continue;
    ids.add(apiConstraintIdToUi(item.id));
    if (item.source?.templateId) ids.add(item.source.templateId);
  }
  if (input.summary) {
    ids.add('time_range', 'budget', 'accommodation', 'must_go');
    if (isSelfDrivePlanningTrip(input.trip)) {
      ids.add('daily_drive', 'road_restrictions', 'max_segment_distance', 'no_night_drive');
    }
  }
  return [...ids];
}
