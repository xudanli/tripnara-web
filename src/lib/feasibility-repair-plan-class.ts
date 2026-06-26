/** 计划类 / Plan B 修复 — 用于文案与是否展示行程 diff */
const PLAN_CLASS_ACTIONS = new Set([
  'adjust_time',
  'replace_poi',
  'reorder_pois',
  'move_to_day',
  'remove_pois',
  'find_alternative_route',
  'change_hotel',
]);

export function isPlanClassAction(actionType?: string): boolean {
  return actionType != null && PLAN_CLASS_ACTIONS.has(actionType);
}

export const ITINERARY_CHANGE_LABEL: Record<string, string> = {
  time_changed: '改时间',
  removed: '移除',
  added: '新增',
  moved_day: '挪天',
  title_changed: '替换',
};
