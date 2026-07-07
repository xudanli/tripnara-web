import type {
  AutomationAuthorizationCatalog,
  AutomationCatalogAction,
  AutomationGroupSummary,
  AutomationPermissionTier,
} from '@/api/automation-authorization.types';
import type { AutomationDefaultLevel, AutomationTierCounts, AutomationUiLevel } from '@/api/travel-status.types';
import type { AiCompletedWorkItem } from '@/api/travel-status.types';
import type { TripConstraintsContract } from '@/types/trip-constraints';
import { humanizeTravelActivitySummary } from '@/lib/travel-status-display.util';

export type { AutomationUiLevel, AutomationTierCounts } from '@/api/travel-status.types';

export type AutomationFilterTab = 'auto' | 'confirm' | 'prohibited' | 'rules';

export interface AutomationUiLevelDefinition {
  defaultLevel: AutomationDefaultLevel;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  recommended?: boolean;
  locked?: boolean;
}

export interface AutomationUiLevelMeta {
  id: AutomationUiLevel;
  apiLevel: AutomationDefaultLevel;
  title: string;
  subtitle: string;
  description: string;
  recommended?: boolean;
  locked?: boolean;
}

/** BFF uiLevel ↔ defaultLevel（四档 UI） */
export const AUTOMATION_UI_LEVEL_MAP: Record<AutomationUiLevel, AutomationUiLevelDefinition> = {
  L0_L1: {
    defaultLevel: 'INFORM_ONLY',
    label: '观察与提醒',
    title: 'L0/L1 观察与提醒',
    subtitle: '观察与提醒',
    description: '主动监控并提醒风险，不自动修改行程。',
  },
  L2: {
    defaultLevel: 'SUGGEST',
    label: '建议执行',
    title: 'L2 建议执行',
    subtitle: '建议执行',
    description: 'AI 给出修复方案，你确认后才写入有效行程。',
    recommended: true,
  },
  L3: {
    defaultLevel: 'AUTO_REPAIR_LOW_RISK',
    label: '边界内自动执行',
    title: 'L3 边界内自动执行',
    subtitle: '边界内自动执行',
    description: '低风险调整（缓冲、顺延等）在预设边界内自动执行。',
  },
  L4: {
    defaultLevel: 'AUTO_EXECUTE_CONDITIONAL',
    label: '高度自主',
    title: 'L4 高度自主',
    subtitle: '高度自主（实验）',
    description: '在宽边界内自动执行更多任务，仍受硬约束与签收规则限制。',
    locked: true,
  },
};

export const AUTOMATION_UI_LEVELS: AutomationUiLevelMeta[] = (
  Object.entries(AUTOMATION_UI_LEVEL_MAP) as Array<[AutomationUiLevel, AutomationUiLevelDefinition]>
).map(([id, def]) => ({
  id,
  apiLevel: def.defaultLevel,
  title: def.title,
  subtitle: def.subtitle,
  description: def.description,
  recommended: def.recommended,
  locked: def.locked,
}));

export type AutomationCategoryStatus =
  | 'all_auto'
  | 'partial_auto'
  | 'partial_confirm'
  | 'needs_confirm'
  | 'prohibited';

export interface AutomationBoundaryItem {
  label: string;
  value: string;
}

export interface AutomationRecentLogItem {
  id: string;
  title: string;
  detail?: string;
  occurredAt?: string;
  autoExecuted: boolean;
  undoLogId?: string;
  undoEnabled?: boolean;
}

const GROUP_ICON_KEYS: Record<string, string> = {
  MONITORING: 'environment',
  TIME_ROUTE: 'time_route',
  ACTIVITY: 'activities',
  BUDGET_BOOKING: 'budget',
  SAFETY: 'safety',
  TEAM_PRIVACY: 'team',
};

export const AUTOMATION_AUTHORIZATION_VIEW_SCHEMA_ID =
  'tripnara.automation_authorization_view@v1';

export const EXPECTED_AUTOMATION_CATALOG_GROUP_COUNT = 6;

/** catalog.groups 固定顺序 */
export const AUTOMATION_CATALOG_GROUP_ORDER = [
  'MONITORING',
  'TIME_ROUTE',
  'ACTIVITY',
  'BUDGET_BOOKING',
  'SAFETY',
  'TEAM_PRIVACY',
] as const;

const CATALOG_GROUP_ORDER_INDEX = Object.fromEntries(
  AUTOMATION_CATALOG_GROUP_ORDER.map((key, index) => [key, index]),
) as Record<string, number>;

export function sortCatalogGroupsByCanonicalOrder(
  groups: AutomationGroupSummary[],
): AutomationGroupSummary[] {
  return [...groups].sort((a, b) => {
    const ai = CATALOG_GROUP_ORDER_INDEX[a.group] ?? 999;
    const bi = CATALOG_GROUP_ORDER_INDEX[b.group] ?? 999;
    return ai - bi;
  });
}

export function parseAutomationUiLevel(raw: unknown): AutomationUiLevel | null {
  if (raw === 'L0_L1' || raw === 'L2' || raw === 'L3' || raw === 'L4') return raw;
  return null;
}

export function groupIconKey(group: string): string {
  return GROUP_ICON_KEYS[group] ?? 'environment';
}

export function apiLevelToUiLevel(level?: AutomationDefaultLevel | null): AutomationUiLevel {
  switch (level) {
    case 'AUTO_EXECUTE_CONDITIONAL':
      return 'L4';
    case 'AUTO_REPAIR_LOW_RISK':
      return 'L3';
    case 'SUGGEST':
      return 'L2';
    case 'INFORM_ONLY':
      return 'L0_L1';
    default:
      return 'L2';
  }
}

export function uiLevelToApiLevel(level: AutomationUiLevel): AutomationDefaultLevel {
  return AUTOMATION_UI_LEVEL_MAP[level]?.defaultLevel ?? 'SUGGEST';
}

export function resolveAutomationUiLevel(
  automation?: { uiLevel?: string | null; defaultLevel?: AutomationDefaultLevel | null } | null,
): AutomationUiLevel {
  const parsed = parseAutomationUiLevel(automation?.uiLevel);
  if (parsed) return parsed;
  return apiLevelToUiLevel(automation?.defaultLevel);
}

/** §5 组右侧 chip 文案 */
export function groupChipLabel(group: AutomationGroupSummary): string {
  const n = group.actions.length;
  if (n === 0) return '暂无规则';
  if (group.denyCount > 0 && group.denyCount >= n / 2) return '禁止自动执行';
  if (group.askCount === n) return '执行前需确认';
  if (group.autoCount === n) return '全部自动执行';
  if (group.autoCount > 0 && group.askCount > 0) return '部分自动执行';
  return '部分需确认';
}

export function groupChipToStatus(label: string): AutomationCategoryStatus {
  if (label === '全部自动执行') return 'all_auto';
  if (label === '部分自动执行') return 'partial_auto';
  if (label === '部分需确认') return 'partial_confirm';
  if (label === '执行前需确认') return 'needs_confirm';
  if (label === '禁止自动执行') return 'prohibited';
  return 'partial_confirm';
}

export function tierToFilterTab(tier: AutomationPermissionTier): AutomationFilterTab {
  if (tier === 'AUTO') return 'auto';
  if (tier === 'DENY') return 'prohibited';
  return 'confirm';
}

export function countCatalogByTier(
  catalog: AutomationAuthorizationCatalog | undefined | null,
  tier: AutomationPermissionTier,
): number {
  if (!catalog?.groups?.length) return 0;
  return catalog.groups.reduce(
    (sum, group) => sum + group.actions.filter((a) => a.effectiveTier === tier).length,
    0,
  );
}

export function resolveAutomationTabCounts(
  catalog: AutomationAuthorizationCatalog | undefined | null,
  tierCounts?: AutomationTierCounts | null,
): Record<AutomationFilterTab, number> {
  const rules = catalog?.groups?.length ?? 0;
  if (tierCounts) {
    return {
      auto: tierCounts.auto,
      confirm: tierCounts.ask,
      prohibited: tierCounts.deny,
      rules,
    };
  }
  return {
    auto: countCatalogByTier(catalog, 'AUTO'),
    confirm: countCatalogByTier(catalog, 'ASK'),
    prohibited: countCatalogByTier(catalog, 'DENY'),
    rules,
  };
}

export function filterCatalogGroups(
  groups: AutomationGroupSummary[],
  tab: AutomationFilterTab,
): AutomationGroupSummary[] {
  if (tab === 'rules') return groups;
  const tier: AutomationPermissionTier =
    tab === 'auto' ? 'AUTO' : tab === 'prohibited' ? 'DENY' : 'ASK';

  return groups
    .map((group) => ({
      ...group,
      actions: group.actions.filter((action) => action.effectiveTier === tier),
    }))
    .filter((group) => group.actions.length > 0);
}

export function applyActionOverridesToCatalog(
  groups: AutomationGroupSummary[],
  overrides: Record<string, AutomationPermissionTier>,
): AutomationGroupSummary[] {
  if (!groups.length) return groups;

  return groups.map((group) => {
    const actions = group.actions.map((action) => {
      const override = overrides[action.key];
      if (!override) return action;
      return { ...action, effectiveTier: override, userOverride: override };
    });

    return recalculateGroupTierCounts({ ...group, actions });
  });
}

const PERMISSION_TIER_RANK: Record<AutomationPermissionTier, number> = {
  DENY: 0,
  ASK: 1,
  AUTO: 2,
};

/** 取更严格（权限更低）的 tier */
export function minPermissionTier(
  a: AutomationPermissionTier,
  b: AutomationPermissionTier,
): AutomationPermissionTier {
  return PERMISSION_TIER_RANK[a] <= PERMISSION_TIER_RANK[b] ? a : b;
}

/** 监控/提醒类动作：低档位仍可为 AUTO */
export function isInformationalAutomationActionKey(actionKey: string): boolean {
  return (
    actionKey.startsWith('monitoring.') ||
    actionKey.startsWith('tasks.create_update_reminders') ||
    actionKey === 'budget.forecast_update' ||
    actionKey.startsWith('decision_queue.surface') ||
    actionKey === 'plan.record_changes_sync'
  );
}

/** 当前 L 档位对该动作允许的最高权限（再与 floorTier 取 min） */
export function resolveLevelMaxTier(
  uiLevel: AutomationUiLevel,
  actionKey: string,
): AutomationPermissionTier {
  switch (uiLevel) {
    case 'L0_L1':
      return 'ASK';
    case 'L2':
      return isInformationalAutomationActionKey(actionKey) ? 'AUTO' : 'ASK';
    case 'L3':
    case 'L4':
      return 'AUTO';
    default:
      return 'ASK';
  }
}

export function resolveActionTierCeiling(
  action: AutomationCatalogAction,
  uiLevel: AutomationUiLevel,
): AutomationPermissionTier {
  let ceiling = resolveLevelMaxTier(uiLevel, action.key);
  if (action.floorTier) {
    ceiling = minPermissionTier(ceiling, action.floorTier);
  }
  return ceiling;
}

export function resolveActionEffectiveTier(
  action: AutomationCatalogAction,
  uiLevel: AutomationUiLevel,
  overrides: Record<string, AutomationPermissionTier>,
): AutomationPermissionTier {
  const baseTier =
    overrides[action.key] ??
    action.userOverride ??
    action.defaultTier ??
    action.effectiveTier;
  const ceiling = resolveActionTierCeiling(action, uiLevel);
  return minPermissionTier(baseTier, ceiling);
}

const PERMISSION_TIER_ORDER: AutomationPermissionTier[] = ['DENY', 'ASK', 'AUTO'];

/** 当前档位 + floorTier 下用户可选的 tier 列表 */
export function allowedTiersForAction(
  action: AutomationCatalogAction,
  uiLevel: AutomationUiLevel,
): AutomationPermissionTier[] {
  const ceiling = resolveActionTierCeiling(action, uiLevel);
  return PERMISSION_TIER_ORDER.filter(
    (tier) => PERMISSION_TIER_RANK[tier] <= PERMISSION_TIER_RANK[ceiling],
  );
}

function recalculateGroupTierCounts(group: AutomationGroupSummary): AutomationGroupSummary {
  const actions = group.actions;
  return {
    ...group,
    autoCount: actions.filter((a) => a.effectiveTier === 'AUTO').length,
    askCount: actions.filter((a) => a.effectiveTier === 'ASK').length,
    denyCount: actions.filter((a) => a.effectiveTier === 'DENY').length,
  };
}

export function applyUiLevelToCatalog(
  groups: AutomationGroupSummary[],
  uiLevel: AutomationUiLevel,
  overrides: Record<string, AutomationPermissionTier>,
): AutomationGroupSummary[] {
  if (!groups.length) return groups;

  return groups.map((group) => {
    const actions = group.actions.map((action) => {
      const effectiveTier = resolveActionEffectiveTier(action, uiLevel, overrides);
      const override = overrides[action.key];
      return {
        ...action,
        effectiveTier,
        userOverride: override ?? action.userOverride,
      };
    });
    return recalculateGroupTierCounts({ ...group, actions });
  });
}

export function buildCatalogWithOverrides(
  catalog: AutomationAuthorizationCatalog | undefined | null,
  overrides: Record<string, AutomationPermissionTier>,
): AutomationAuthorizationCatalog | null {
  if (!catalog?.groups?.length) return catalog ?? null;
  return {
    ...catalog,
    groups: applyActionOverridesToCatalog(catalog.groups, overrides),
  };
}

/** 按所选 L 档位 + overrides 预览 catalog（切换档位时下方 Tab/组计数随之变化） */
export function buildCatalogForUiLevel(
  catalog: AutomationAuthorizationCatalog | undefined | null,
  uiLevel: AutomationUiLevel,
  overrides: Record<string, AutomationPermissionTier>,
): AutomationAuthorizationCatalog | null {
  if (!catalog?.groups?.length) return catalog ?? null;
  return {
    ...catalog,
    groups: applyUiLevelToCatalog(catalog.groups, uiLevel, overrides),
  };
}

export function resolveAutomationBoundaries(
  contract?: TripConstraintsContract | null,
): AutomationBoundaryItem[] {
  const tolerances = contract?.changeStrategy?.tolerances ?? {};
  const budgetPct = tolerances.maxBudgetOverrunPct;
  const delayMin = tolerances.maxDelayMinutes;
  const execConditions = contract?.automation?.executionConditions ?? {};

  const hasCoreProtection = Object.values(execConditions).some(
    (row) => row && typeof row === 'object' && (row as { excludeCoreActivities?: boolean }).excludeCoreActivities,
  );
  const hasUnbookedOnly = Object.values(execConditions).some(
    (row) => row && typeof row === 'object' && (row as { onlyUnbooked?: boolean }).onlyUnbooked,
  );

  return [
    {
      label: '预算变动上限',
      value:
        typeof budgetPct === 'number'
          ? `± ${budgetPct}% / 人`
          : '± ¥1,000 / 人（默认）',
    },
    {
      label: '单日时间变动',
      value:
        typeof delayMin === 'number'
          ? `${Math.round(Number(delayMin) / 60)} 小时 / 天`
          : '2 小时 / 天（默认）',
    },
    {
      label: '核心体验保护',
      value: hasCoreProtection ? '严格保护（不可删除/替换核心段）' : '按 catalog 默认规则',
    },
    {
      label: '已预订项保护',
      value: hasUnbookedOnly ? '仅调整未预订活动' : '允许部分已预订项协商',
    },
    {
      label: '通知策略',
      value: '每次自动执行后通知我',
    },
  ];
}

export function categoryStatusLabel(status: AutomationCategoryStatus): string {
  switch (status) {
    case 'all_auto':
      return '全部可自动执行';
    case 'partial_auto':
      return '部分可自动执行';
    case 'partial_confirm':
      return '部分需确认';
    case 'needs_confirm':
      return '需确认后执行';
    case 'prohibited':
      return '禁止自动执行';
  }
}

export function tierLabel(tier: AutomationPermissionTier): string {
  switch (tier) {
    case 'AUTO':
      return '自动处理';
    case 'ASK':
      return '需要我确认';
    case 'DENY':
      return '禁止自动执行';
  }
}

export function mapRecentLogs(items: AiCompletedWorkItem[]): AutomationRecentLogItem[] {
  return items.slice(0, 8).map((item) => ({
    id: item.activityId,
    title: humanizeTravelActivitySummary(item.changeSummary ?? item.summary) || item.kind,
    detail: item.kind,
    occurredAt: item.occurredAt,
    autoExecuted: item.automatic === true,
    undoLogId: item.undo?.logId ?? item.activityId,
    undoEnabled: item.undo?.enabled === true,
  }));
}

export type AutomationGroupKey = AutomationGroupSummary['group'];
