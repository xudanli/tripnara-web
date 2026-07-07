import type { AutomationAuthorizationCatalog } from '@/api/automation-authorization.types';

/** catalog action key / 旧 contract 字段 → 中文名称（API label 缺失时的 SSOT） */
export const AUTOMATION_ACTION_LABEL_ZH: Record<string, string> = {
  // ── 旧 contract 列表字段（autoAllowed / confirmationRequired）──
  refresh_road_weather_evidence: '更新天气与道路证据',
  shift_meal_within_30min: '30 分钟内顺延用餐',
  add_activity_buffer_15min: '增加 15 分钟活动缓冲',
  remove_poi: '移除景点',
  change_lodging: '变更住宿',
  increase_cost: '增加行程费用',
  change_intercity_route: '变更城际路线',

  // ── MONITORING ──
  'monitoring.weather_road_update': '更新天气与道路状态',
  'monitoring.poi_status': '更新景点开放状态',
  'monitoring.transport_status': '更新交通状态',
  'monitoring.booking_status': '更新预订状态',
  'monitoring.activity_status': '更新活动状态',
  'monitoring.trip_progress': '更新行程进度',
  'tasks.create_update_reminders': '创建或更新提醒',

  // ── TIME_ROUTE ──
  'time_route.update_eta': '更新预计到达时间',
  'time_route.shift_unstarted': '顺延未开始活动',
  'time_route.insert_rest_buffer': '插入休息缓冲',
  'time_route.insert_fuel_charge': '插入加油/充电停留',
  'time_route.optimize_route': '优化路线顺序',
  'time_route.reorder_optional': '重排可选路线项',
  'time_route.check_day_feasibility': '复核当日可行性',
  'time_route.reroute_for_closure': '因道路封闭改道',
  'time_route.cross_day_move': '跨天移动活动',
  'plan.record_changes_sync': '记录变更并同步',

  // ── ACTIVITY ──
  'activity.generate_plan_b': '生成 Plan B 备选',
  'activity.enable_plan_b': '启用 Plan B',
  'activity.reorder_unbooked_low_priority': '重排未预订低优先级活动',
  'activity.replace_normal': '替换普通活动',
  'activity.trim_optional_items': '裁剪可选活动',
  'activity.replace_core': '替换核心活动',
  'activity.adjust_booked': '调整已预订活动',
  'decision_queue.surface_issues': '浮出待决策问题',

  // ── BUDGET_BOOKING ──
  'budget.forecast_update': '更新预算预测',
  'budget.increase': '增加预算',
  'booking.change_lodging': '变更住宿',
  'booking.change_transport': '变更交通预订',
  'booking.cancel': '取消预订',
  'booking.payment': '支付或付款',

  // ── SAFETY ──
  'safety.reduce_intensity': '降低活动强度',
  'safety.avoid_closed_road': '避开封闭道路',
  'safety.elevate_warnings': '升级安全警告',
  'safety.enable_high_risk_route': '启用高风险路线',
  'safety.ignore_official_warning': '忽略官方预警',
  'safety.lower_safety_level': '降低安全等级',

  // ── TEAM_PRIVACY ──
  'team.sync_plan_changes': '同步计划变更给团队',
  'team.remind_members': '提醒团队成员',
  'team.start_vote': '发起团队投票',
  'team.send_external_message': '发送外部消息',
  'team.share_location': '共享位置',
  'team.proxy_consent': '代行同意',
};

/** 旧 contract key → catalog key */
const LEGACY_ACTION_KEY_ALIASES: Record<string, string> = {
  refresh_road_weather_evidence: 'monitoring.weather_road_update',
  shift_meal_within_30min: 'time_route.shift_unstarted',
  add_activity_buffer_15min: 'time_route.insert_rest_buffer',
  remove_poi: 'activity.trim_optional_items',
  change_lodging: 'booking.change_lodging',
  increase_cost: 'budget.increase',
  change_intercity_route: 'time_route.cross_day_move',
};

const SEGMENT_LABEL_ZH: Record<string, string> = {
  monitoring: '监控',
  time_route: '时间路线',
  activity: '活动',
  budget: '预算',
  booking: '预订',
  safety: '安全',
  team: '团队',
  tasks: '任务',
  plan: '计划',
  decision_queue: '决策队列',
  weather: '天气',
  road: '道路',
  poi: '景点',
  lodging: '住宿',
  transport: '交通',
  optional: '可选',
  unbooked: '未预订',
  buffer: '缓冲',
  update: '更新',
  change: '变更',
  remove: '移除',
  increase: '增加',
  shift: '顺延',
  insert: '插入',
  reorder: '重排',
  replace: '替换',
  trim: '裁剪',
  enable: '启用',
  reduce: '降低',
  avoid: '避开',
  share: '共享',
  remind: '提醒',
};

export type AutomationActionLabelIndex = ReadonlyMap<string, string>;

export function buildAutomationActionLabelIndex(
  catalog?: AutomationAuthorizationCatalog | null,
): AutomationActionLabelIndex {
  const index = new Map<string, string>(Object.entries(AUTOMATION_ACTION_LABEL_ZH));

  for (const group of catalog?.groups ?? []) {
    for (const action of group.actions) {
      const key = action.key?.trim();
      const label = action.label?.trim();
      if (key && label) index.set(key, label);
    }
  }

  return index;
}

export function resolveAutomationActionLabel(
  key: string,
  labelIndex?: AutomationActionLabelIndex | null,
): string {
  const trimmed = key.trim();
  if (!trimmed) return key;

  const fromIndex = labelIndex?.get(trimmed);
  if (fromIndex) return fromIndex;

  const staticLabel = AUTOMATION_ACTION_LABEL_ZH[trimmed];
  if (staticLabel) return staticLabel;

  const aliasKey = LEGACY_ACTION_KEY_ALIASES[trimmed];
  if (aliasKey) {
    const aliased =
      labelIndex?.get(aliasKey) ?? AUTOMATION_ACTION_LABEL_ZH[aliasKey];
    if (aliased) return aliased;
  }

  return humanizeAutomationActionKey(trimmed);
}

function humanizeAutomationActionKey(key: string): string {
  const segments = key.includes('.') ? key.split('.') : key.split('_');
  const tail = segments[segments.length - 1] ?? key;

  const translated = segments
    .flatMap((segment) => segment.split('_'))
    .filter(Boolean)
    .map((part) => SEGMENT_LABEL_ZH[part.toLowerCase()] ?? part.replace(/_/g, ' '))
    .join('');

  if (translated && translated !== key) return translated;

  return tail.replace(/_/g, ' ');
}

export function resolveAutomationActionLabels(
  keys: string[],
  labelIndex?: AutomationActionLabelIndex | null,
): Array<{ key: string; label: string }> {
  return keys.map((key) => ({
    key,
    label: resolveAutomationActionLabel(key, labelIndex),
  }));
}
