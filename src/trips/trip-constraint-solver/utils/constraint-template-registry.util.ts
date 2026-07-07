import { CATALOG_HARD_TEMPLATE_IDS, CATALOG_SOFT_TEMPLATE_IDS } from '@/lib/constraint-catalog-template-ids';
import { resolveSoftTemplateDefaultPriority } from '@/lib/soft-constraint.util';
import type {
  ConstraintTemplateCatalog,
  ConstraintTemplateHardCategory,
  ConstraintTemplateRegistryEntry,
  SolverRuleKind,
} from './constraint-template-registry.types';
import { SOLVER_RULE_KINDS } from './constraint-template-registry.types';

type SoftPreferencePriority = '高' | '中' | '低';

const SOFT_PRIORITY_TO_API: Record<SoftPreferencePriority, number> = {
  高: 8,
  中: 5,
  低: 3,
};

const SOFT_PRIORITY_TO_INTENSITY: Record<SoftPreferencePriority, number> = {
  高: 85,
  中: 50,
  低: 25,
};

const SOFT_TEMPLATE_CANONICAL_WEIGHT_KEY: Record<string, string> = {
  budget_soft: 'budget_deviation',
  allow_budget_overrun: 'budget_deviation',
  minimize_hotel_changes: 'fewer_hotel_changes',
  lunch_time_window: 'lunch_window_deviation',
  max_major_pois_per_day: 'poi_count_deviation',
  daily_free_time: 'free_time_shortfall',
  avoid_early: 'early_departure_penalty',
  avoid_backtracking: 'backtracking_penalty',
  prefer_nature_scenery: 'nature_scenery_boost',
  attractions_over_shopping: 'shopping_penalty',
  less_shopping: 'shopping_penalty',
  sunset_photography: 'photography_timing',
  aurora_photo: 'photography_timing',
  prefer_local_food: 'local_food_boost',
  avoid_crowds: 'crowd_penalty',
  elderly_rest: 'rest_break_shortfall',
};

function cTpl(templateId: string): string {
  return `c_tpl_${templateId}`;
}

function softDefaults(templateId: string, priority: SoftPreferencePriority): Pick<
  ConstraintTemplateRegistryEntry,
  'defaultPriority' | 'defaultIntensity'
> {
  return {
    defaultPriority: SOFT_PRIORITY_TO_API[priority],
    defaultIntensity: SOFT_PRIORITY_TO_INTENSITY[priority],
  };
}

function hardEntry(input: {
  templateId: string;
  defaultName: string;
  defaultDescription: string;
  category: ConstraintTemplateHardCategory;
  solverRuleKind: SolverRuleKind;
  legacyPatchOnly?: boolean;
}): ConstraintTemplateRegistryEntry {
  return {
    templateId: input.templateId,
    constraintId: cTpl(input.templateId),
    defaultName: input.defaultName,
    defaultDescription: input.defaultDescription,
    type: 'HARD',
    sectionKey: 'hard_must_satisfy',
    category: input.category,
    solverRuleKind: input.solverRuleKind,
    legacyPatchOnly: input.legacyPatchOnly ?? false,
  };
}

function softEntry(input: {
  templateId: string;
  defaultName: string;
  defaultDescription: string;
  solverRuleKind: SolverRuleKind;
  priority?: SoftPreferencePriority;
}): ConstraintTemplateRegistryEntry {
  const priority = input.priority ?? resolveSoftTemplateDefaultPriority(input.templateId);
  return {
    templateId: input.templateId,
    constraintId: cTpl(input.templateId),
    defaultName: input.defaultName,
    defaultDescription: input.defaultDescription,
    type: 'SOFT',
    sectionKey: 'soft_prefer',
    solverRuleKind: input.solverRuleKind,
    legacyPatchOnly: false,
    canonicalWeightKey: SOFT_TEMPLATE_CANONICAL_WEIGHT_KEY[input.templateId],
    ...softDefaults(input.templateId, priority),
  };
}

/** @deprecated 使用 CATALOG_HARD_TEMPLATE_IDS */
export const REGISTRY_HARD_TEMPLATE_IDS = CATALOG_HARD_TEMPLATE_IDS;

/** @deprecated 使用 CATALOG_SOFT_TEMPLATE_IDS */
export const REGISTRY_SOFT_TEMPLATE_IDS = CATALOG_SOFT_TEMPLATE_IDS;

const CONSTRAINT_TEMPLATE_REGISTRY: ConstraintTemplateRegistryEntry[] = [
  hardEntry({
    templateId: 'earliest_departure',
    defaultName: '最早出发时间',
    defaultDescription: '每日最早出发时间不早于设定时刻',
    category: 'TIME',
    solverRuleKind: 'time_window',
  }),
  hardEntry({
    templateId: 'latest_end',
    defaultName: '最晚结束时间',
    defaultDescription: '每日结束时间不晚于设定时刻',
    category: 'TIME',
    solverRuleKind: 'time_window',
  }),
  hardEntry({
    templateId: 'max_daily_activity',
    defaultName: '每日最大活动时长',
    defaultDescription: '限制单日活动总时长，避免过度疲劳',
    category: 'TIME',
    solverRuleKind: 'time_budget',
  }),
  hardEntry({
    templateId: 'required_rest',
    defaultName: '必须保留的休息时间',
    defaultDescription: '行程中须保留规定的休息与缓冲时段',
    category: 'TIME',
    solverRuleKind: 'time_budget',
  }),
  hardEntry({
    templateId: 'fixed_appointments',
    defaultName: '固定航班 / 预约 / 入住',
    defaultDescription: '固定航班、预约、入住时间不可被挪动',
    category: 'TIME',
    solverRuleKind: 'time_window',
  }),
  hardEntry({
    templateId: 'activity_budget',
    defaultName: '单项活动上限',
    defaultDescription: '单项活动花费不超过设定上限',
    category: 'BUDGET',
    solverRuleKind: 'budget',
  }),
  hardEntry({
    templateId: 'budget_overrun_tolerance',
    defaultName: '超预算容忍额度',
    defaultDescription: '允许超出总预算的最大幅度（百分比或金额）',
    category: 'BUDGET',
    solverRuleKind: 'budget',
  }),
  hardEntry({
    templateId: 'elderly_walk_limit',
    defaultName: '老人步行上限',
    defaultDescription: '老人单日步行距离不超过设定上限',
    category: 'MEMBER',
    solverRuleKind: 'daily_count',
  }),
  hardEntry({
    templateId: 'child_nap_time',
    defaultName: '儿童午睡时间',
    defaultDescription: '午睡时段内不得安排高强度活动',
    category: 'MEMBER',
    solverRuleKind: 'time_window',
  }),
  hardEntry({
    templateId: 'accessibility',
    defaultName: '无障碍要求',
    defaultDescription: '行程须满足轮椅、坡道等无障碍通行要求',
    category: 'MEMBER',
    solverRuleKind: 'route_shape',
  }),
  hardEntry({
    templateId: 'motion_sickness',
    defaultName: '晕车 / 恐高限制',
    defaultDescription: '避免引发晕车、恐高等不适的安排',
    category: 'MEMBER',
    solverRuleKind: 'route_shape',
  }),
  hardEntry({
    templateId: 'dietary_restrictions',
    defaultName: '饮食禁忌',
    defaultDescription: '餐饮安排须避开设定饮食禁忌',
    category: 'MEMBER',
    solverRuleKind: 'poi_preference',
  }),
  hardEntry({
    templateId: 'no_unpaved_road',
    defaultName: '不走未铺装道路',
    defaultDescription: '不得安排未铺装或高风险路况路段',
    category: 'RISK',
    solverRuleKind: 'route_shape',
  }),
  hardEntry({
    templateId: 'no_bad_weather',
    defaultName: '不在恶劣天气出行',
    defaultDescription: '恶劣天气条件下不得安排受影响出行',
    category: 'RISK',
    solverRuleKind: 'route_shape',
  }),
  hardEntry({
    templateId: 'no_high_risk_activity',
    defaultName: '不参加高风险活动',
    defaultDescription: '不得安排高风险或未评估活动',
    category: 'RISK',
    solverRuleKind: 'poi_preference',
  }),
  hardEntry({
    templateId: 'no_unverified_route',
    defaultName: '不接受无官方证据路线',
    defaultDescription: '不接受缺乏官方证据或验证的路线',
    category: 'RISK',
    solverRuleKind: 'route_shape',
  }),

  softEntry({
    templateId: 'lunch_time_window',
    defaultName: '午餐时间窗',
    defaultDescription: '午餐尽量安排在 12:00–13:30，避免过晚影响下午行程',
    solverRuleKind: 'time_window',
  }),
  softEntry({
    templateId: 'max_major_pois_per_day',
    defaultName: '每日主要景点上限',
    defaultDescription: '每天最好不超过 3 个主要景点，避免行程过满',
    solverRuleKind: 'daily_count',
  }),
  softEntry({
    templateId: 'minimize_hotel_changes',
    defaultName: '少换酒店',
    defaultDescription: '尽量连续住同一家酒店，减少打包与通勤成本',
    solverRuleKind: 'lodging_continuity',
    priority: '高',
  }),
  softEntry({
    templateId: 'daily_free_time',
    defaultName: '每日自由时间',
    defaultDescription: '每天保留约 1 小时自由时间，应对临时调整或休息',
    solverRuleKind: 'time_budget',
  }),
  softEntry({
    templateId: 'avoid_early',
    defaultName: '尽量避免早起',
    defaultDescription: '控制连续早出发天数，优先安排合理出发时刻',
    solverRuleKind: 'time_window',
  }),
  softEntry({
    templateId: 'avoid_backtracking',
    defaultName: '尽量不走回头路',
    defaultDescription: '路线规划时减少折返与重复路段',
    solverRuleKind: 'route_shape',
  }),
  softEntry({
    templateId: 'prefer_nature_scenery',
    defaultName: '多安排自然景观',
    defaultDescription: '排程时倾向自然风光、观景点与户外体验',
    solverRuleKind: 'poi_preference',
  }),
  softEntry({
    templateId: 'less_shopping',
    defaultName: '少安排购物',
    defaultDescription: '控制购物点数量与时长，把时间留给核心体验',
    solverRuleKind: 'poi_preference',
    priority: '低',
  }),
  softEntry({
    templateId: 'sunset_photography',
    defaultName: '日落摄影',
    defaultDescription: '在条件允许时优先预留日落拍摄时段与机位',
    solverRuleKind: 'time_window',
    priority: '低',
  }),
  softEntry({
    templateId: 'budget_soft',
    defaultName: '控制预算',
    defaultDescription: '尽量控制花费；与其他软约束冲突时可适度让步',
    solverRuleKind: 'budget',
    priority: '高',
  }),
  softEntry({
    templateId: 'allow_budget_overrun',
    defaultName: '允许临时超预算',
    defaultDescription: '是否允许在特殊情况下临时超出总预算（可协商）',
    solverRuleKind: 'budget',
  }),
  softEntry({
    templateId: 'elderly_rest',
    defaultName: '老人下午需休息',
    defaultDescription: '15:00 前安排休息或低强度活动',
    solverRuleKind: 'time_window',
    priority: '高',
  }),
  softEntry({
    templateId: 'aurora_photo',
    defaultName: '尽量拍摄极光',
    defaultDescription: '在条件允许时优先安排极光观测',
    solverRuleKind: 'time_window',
    priority: '低',
  }),
  softEntry({
    templateId: 'prefer_local_food',
    defaultName: '优先当地美食',
    defaultDescription: '排程时预留特色餐饮体验',
    solverRuleKind: 'poi_preference',
  }),
  softEntry({
    templateId: 'avoid_crowds',
    defaultName: '避开人潮',
    defaultDescription: '倾向错峰或小众景点',
    solverRuleKind: 'crowd_avoidance',
  }),
];

export function listConstraintTemplateRegistry(): readonly ConstraintTemplateRegistryEntry[] {
  return CONSTRAINT_TEMPLATE_REGISTRY;
}

export function getConstraintTemplateRegistryEntry(
  templateId: string,
): ConstraintTemplateRegistryEntry | undefined {
  return CONSTRAINT_TEMPLATE_REGISTRY.find((entry) => entry.templateId === templateId);
}

export function isRegistryCatalogTemplateId(templateId: string): boolean {
  return Boolean(getConstraintTemplateRegistryEntry(templateId));
}

/** 导出 JSON 快照（CI 与 schemas/constraint-template-registry.json 对齐） */
export function exportConstraintTemplateCatalog(): ConstraintTemplateCatalog {
  const hard = CONSTRAINT_TEMPLATE_REGISTRY.filter((t) => t.type === 'HARD');
  const soft = CONSTRAINT_TEMPLATE_REGISTRY.filter((t) => t.type === 'SOFT');
  return {
    schemaVersion: '1.0.0',
    hardCount: hard.length,
    softCount: soft.length,
    templateCount: CONSTRAINT_TEMPLATE_REGISTRY.length,
    solverRuleKinds: [...SOLVER_RULE_KINDS],
    templates: CONSTRAINT_TEMPLATE_REGISTRY.map(({ ...entry }) => entry),
  };
}
