import type { SoftPreferencePriority } from '@/components/plan-studio/workbench/constraint-console-view.util';

/** 尽量满足 · 分区说明（SSOT） */
export const SOFT_PREFER_SECTION_INTRO =
  '软约束不是必须满足，而是系统会尽量满足。无法全部实现时，按重要程度决定优先牺牲哪一项（低 → 中 → 高 最后牺牲）。';

export const SOFT_PREFER_PRIORITY_HINT = '重要程度 · 冲突时优先牺牲较低项';

export const SOFT_PREFER_EXAMPLE_BULLETS = [
  '午餐尽量安排在 12:00–13:30',
  '每天最好不超过 3 个主要景点',
  '连续住同一家酒店',
  '每天保留 1 小时自由时间',
  '尽量避免早起 · 尽量不走回头路',
  '多安排自然景观 · 少安排购物',
] as const;

/** 模板默认重要程度（添加时写入，用户可再调） */
export const SOFT_TEMPLATE_DEFAULT_PRIORITY: Record<string, SoftPreferencePriority> = {
  minimize_hotel_changes: '高',
  budget_soft: '高',
  allow_budget_overrun: '中',
  lunch_time_window: '中',
  max_major_pois_per_day: '中',
  daily_free_time: '中',
  avoid_early: '中',
  avoid_backtracking: '中',
  prefer_nature_scenery: '中',
  attractions_over_shopping: '中',
  less_shopping: '低',
  sunset_photography: '低',
  aurora_photo: '低',
  prefer_local_food: '中',
  avoid_crowds: '中',
  elderly_rest: '高',
};

export function resolveSoftTemplateDefaultPriority(templateId: string): SoftPreferencePriority {
  return SOFT_TEMPLATE_DEFAULT_PRIORITY[templateId] ?? '中';
}

export function resolveSoftConstraintDescription(
  apiDescription?: string | null,
  templateDescription?: string | null,
): string | undefined {
  const fromApi = apiDescription?.trim();
  if (fromApi) return fromApi;
  return templateDescription?.trim() || undefined;
}

export function softPriorityRank(priority: SoftPreferencePriority): number {
  switch (priority) {
    case '高':
      return 3;
    case '中':
      return 2;
    default:
      return 1;
  }
}

/** 按重要程度排序（高 → 低），供列表/详情展示 */
export function sortSoftEntriesByPriority<T extends { sliderValue?: number }>(
  items: T[],
  sliderToPriority: (value: number) => SoftPreferencePriority,
): T[] {
  return [...items].sort((a, b) => {
    const av = a.sliderValue != null ? softPriorityRank(sliderToPriority(a.sliderValue)) : 0;
    const bv = b.sliderValue != null ? softPriorityRank(sliderToPriority(b.sliderValue)) : 0;
    return bv - av;
  });
}
