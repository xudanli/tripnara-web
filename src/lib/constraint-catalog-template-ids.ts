/**
 * Catalog POST 模板 id 白名单 — 无 UI / adapter 依赖，供 registry 与控制台共用。
 * 机器可读 SSOT 条目见 trip-constraint-solver/utils/constraint-template-registry.util.ts
 */

/** catalog POST 硬约束（16 项） */
export const CATALOG_HARD_TEMPLATE_IDS = [
  'earliest_departure',
  'latest_end',
  'max_daily_activity',
  'required_rest',
  'fixed_appointments',
  'activity_budget',
  'budget_overrun_tolerance',
  'elderly_walk_limit',
  'child_nap_time',
  'accessibility',
  'motion_sickness',
  'dietary_restrictions',
  'no_unpaved_road',
  'no_bad_weather',
  'no_high_risk_activity',
  'no_unverified_route',
] as const;

export type CatalogHardTemplateId = (typeof CATALOG_HARD_TEMPLATE_IDS)[number];

/** catalog POST 软偏好（15 项） */
export const CATALOG_SOFT_TEMPLATE_IDS = [
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
  'allow_budget_overrun',
  'elderly_rest',
  'aurora_photo',
  'prefer_local_food',
  'avoid_crowds',
] as const;

export type CatalogSoftTemplateId = (typeof CATALOG_SOFT_TEMPLATE_IDS)[number];

export function isCatalogHardTemplate(id: string): id is CatalogHardTemplateId {
  return (CATALOG_HARD_TEMPLATE_IDS as readonly string[]).includes(id);
}

export function isCatalogSoftTemplate(id: string): boolean {
  return (CATALOG_SOFT_TEMPLATE_IDS as readonly string[]).includes(id);
}
