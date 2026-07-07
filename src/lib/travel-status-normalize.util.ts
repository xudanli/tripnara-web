import type {
  AiCompletedWorkItem,
  DecisionQueueItem,
  MonitoringItem,
  TravelStatusAiCompletedWork,
  TravelStatusAutomation,
  TravelStatusEffectivePlan,
  TravelStatusExecutability,
  TravelStatusMonitoring,
  TravelStatusPendingVerification,
  TravelStatusResponse,
  ContextSnapshotRef,
  AutomationDefaultLevel,
} from '@/api/travel-status.types';
import type {
  AutomationAuthorizationCatalog,
  AutomationCatalogAction,
  AutomationGroupSummary,
  AutomationPermissionTier,
} from '@/api/automation-authorization.types';
import {
  apiLevelToUiLevel,
  countCatalogByTier,
  parseAutomationUiLevel,
  AUTOMATION_UI_LEVEL_MAP,
} from '@/lib/trip-automation-authorization.util';

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

function normalizeExecutability(raw: unknown): TravelStatusExecutability {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const status = obj.status;
  const validStatus =
    status === 'READY' || status === 'NEEDS_ATTENTION' || status === 'BLOCKED'
      ? status
      : 'NEEDS_ATTENTION';

  return {
    status: validStatus,
    headline: typeof obj.headline === 'string' ? obj.headline : '旅行状态加载中',
    subheadline: typeof obj.subheadline === 'string' ? obj.subheadline : undefined,
    issueCount: typeof obj.issueCount === 'number' ? obj.issueCount : undefined,
  };
}

function normalizeRecommendation(raw: unknown): DecisionQueueItem['recommendation'] {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    title: typeof obj.title === 'string' ? obj.title : '推荐方案',
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    keeps: ensureArray<string>(obj.keeps),
    costs: ensureArray<string>(obj.costs),
  };
}

function normalizeDecisionQueueItem(raw: unknown): DecisionQueueItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const problemId = typeof obj.problemId === 'string' ? obj.problemId : typeof obj.id === 'string' ? obj.id : null;
  if (!problemId) return null;

  const actionsRaw = (obj.actions && typeof obj.actions === 'object' ? obj.actions : {}) as Record<
    string,
    unknown
  >;
  const readAction = (key: string) => {
    const action = actionsRaw[key];
    if (!action || typeof action !== 'object') return undefined;
    const a = action as Record<string, unknown>;
    return {
      enabled: a.enabled !== false,
      actionId: typeof a.actionId === 'string' ? a.actionId : undefined,
    };
  };

  const severity = obj.severity;
  const validSeverity =
    severity === 'BLOCK' ||
    severity === 'CONFLICT' ||
    severity === 'VERIFY' ||
    severity === 'OPTIMIZE'
      ? severity
      : 'VERIFY';

  return {
    problemId,
    headline: typeof obj.headline === 'string' ? obj.headline : '待处理事项',
    impact: typeof obj.impact === 'string' ? obj.impact : '',
    recommendation: normalizeRecommendation(obj.recommendation),
    actions: {
      acceptRecommended: readAction('acceptRecommended') ?? { enabled: true },
      keepOriginal: readAction('keepOriginal'),
      viewAlternatives: readAction('viewAlternatives'),
      defer: readAction('defer'),
    },
    severity: validSeverity,
    affectedDayNumbers: ensureArray<number>(obj.affectedDayNumbers),
  };
}

function normalizeOpenDecisions(raw: unknown, root: Record<string, unknown>): DecisionQueueItem[] {
  const candidates: unknown[] = [];

  candidates.push(...ensureArray(raw));

  const decisionQueue = root.decisionQueue;
  if (decisionQueue && typeof decisionQueue === 'object') {
    const dq = decisionQueue as Record<string, unknown>;
    candidates.push(...ensureArray(dq.items));
    candidates.push(...ensureArray(dq.openDecisions));
  }

  if (Array.isArray(root.decisions)) {
    candidates.push(...root.decisions);
  }

  const seen = new Set<string>();
  const items: DecisionQueueItem[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeDecisionQueueItem(candidate);
    if (!normalized || seen.has(normalized.problemId)) continue;
    seen.add(normalized.problemId);
    items.push(normalized);
  }
  return items;
}

function normalizeAiCompletedWorkItem(raw: unknown): AiCompletedWorkItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const activityId =
    typeof obj.activityId === 'string'
      ? obj.activityId
      : typeof obj.id === 'string'
        ? obj.id
        : null;
  if (!activityId) return null;

  const undoRaw = obj.undo && typeof obj.undo === 'object' ? (obj.undo as Record<string, unknown>) : null;

  return {
    activityId,
    occurredAt: typeof obj.occurredAt === 'string' ? obj.occurredAt : new Date().toISOString(),
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    changeSummary: typeof obj.changeSummary === 'string' ? obj.changeSummary : undefined,
    kind:
      obj.kind === 'AUTO_REPAIR' ||
      obj.kind === 'DECISION_APPLIED' ||
      obj.kind === 'DECISION_SUBMITTED'
        ? obj.kind
        : 'DECISION_APPLIED',
    problemId: typeof obj.problemId === 'string' ? obj.problemId : undefined,
    automatic: obj.automatic === true,
    reversible: obj.reversible !== false,
    status: typeof obj.status === 'string' ? obj.status : undefined,
    undo: undoRaw
      ? {
          enabled: undoRaw.enabled === true,
          logId:
            typeof undoRaw.logId === 'string'
              ? undoRaw.logId
              : typeof undoRaw.log_id === 'string'
                ? undoRaw.log_id
                : activityId,
          undoActionId:
            typeof undoRaw.undoActionId === 'string'
              ? undoRaw.undoActionId
              : typeof undoRaw.undo_action_id === 'string'
                ? undoRaw.undo_action_id
                : undefined,
        }
      : undefined,
  };
}

function normalizeAiCompletedWork(raw: unknown): TravelStatusAiCompletedWork {
  if (Array.isArray(raw)) {
    return {
      items: raw.map(normalizeAiCompletedWorkItem).filter(Boolean) as AiCompletedWorkItem[],
    };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      recentCount: typeof obj.recentCount === 'number' ? obj.recentCount : undefined,
      items: ensureArray<unknown>(obj.items)
        .map(normalizeAiCompletedWorkItem)
        .filter(Boolean) as AiCompletedWorkItem[],
    };
  }
  return { items: [] };
}

function normalizeMonitoring(raw: unknown): TravelStatusMonitoring {
  if (Array.isArray(raw)) {
    return { activeCount: 0, items: raw as MonitoringItem[] };
  }
  if (!raw || typeof raw !== 'object') {
    return { activeCount: 0, items: [] };
  }
  const obj = raw as Record<string, unknown>;
  const items = ensureArray<MonitoringItem>(obj.items);
  const activeCount =
    typeof obj.activeCount === 'number'
      ? obj.activeCount
      : items.filter((item) => item?.status === 'ALERT').length;

  return { activeCount, items };
}

function normalizeEffectivePlan(raw: unknown): TravelStatusEffectivePlan {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    versionId: typeof obj.versionId === 'string' ? obj.versionId : undefined,
    headline: typeof obj.headline === 'string' ? obj.headline : undefined,
    summary: typeof obj.summary === 'string' ? obj.summary : undefined,
    dayCount: typeof obj.dayCount === 'number' ? obj.dayCount : undefined,
    itemCount: typeof obj.itemCount === 'number' ? obj.itemCount : undefined,
    lastUpdatedAt: typeof obj.lastUpdatedAt === 'string' ? obj.lastUpdatedAt : undefined,
    planStudioHref: typeof obj.planStudioHref === 'string' ? obj.planStudioHref : undefined,
  };
}

function normalizeAutomationCatalog(raw: unknown): AutomationAuthorizationCatalog {
  if (!raw || typeof raw !== 'object') {
    return { groups: [] };
  }
  const obj = raw as Record<string, unknown>;
  const groupsRaw = ensureArray<unknown>(obj.groups);
  const groups: AutomationGroupSummary[] = groupsRaw
    .map((groupRaw) => {
      if (!groupRaw || typeof groupRaw !== 'object') return null;
      const group = groupRaw as Record<string, unknown>;
      const actionsRaw = ensureArray<unknown>(group.actions);
      const actions: AutomationCatalogAction[] = actionsRaw
        .map((actionRaw) => {
          if (!actionRaw || typeof actionRaw !== 'object') return null;
          const action = actionRaw as Record<string, unknown>;
          const key = typeof action.key === 'string' ? action.key : null;
          if (!key) return null;
          const tier = action.effectiveTier;
          const validTier: AutomationPermissionTier =
            tier === 'AUTO' || tier === 'ASK' || tier === 'DENY' ? tier : 'ASK';
          return {
            key,
            label: typeof action.label === 'string' ? action.label : key,
            effectiveTier: validTier,
            effectiveTierLabel:
              typeof action.effectiveTierLabel === 'string' ? action.effectiveTierLabel : undefined,
            defaultTier:
              action.defaultTier === 'AUTO' ||
              action.defaultTier === 'ASK' ||
              action.defaultTier === 'DENY'
                ? action.defaultTier
                : undefined,
            coldStart: action.coldStart === true,
            userOverride:
              action.userOverride === 'AUTO' ||
              action.userOverride === 'ASK' ||
              action.userOverride === 'DENY'
                ? action.userOverride
                : action.userOverride === null
                  ? null
                  : undefined,
            floorTier:
              action.floorTier === 'AUTO' ||
              action.floorTier === 'ASK' ||
              action.floorTier === 'DENY'
                ? action.floorTier
                : undefined,
          };
        })
        .filter(Boolean) as AutomationCatalogAction[];

      const groupKey = typeof group.group === 'string' ? group.group : 'MONITORING';
      return {
        group: groupKey,
        label: typeof group.label === 'string' ? group.label : groupKey,
        autoCount:
          typeof group.autoCount === 'number'
            ? group.autoCount
            : actions.filter((a) => a.effectiveTier === 'AUTO').length,
        askCount:
          typeof group.askCount === 'number'
            ? group.askCount
            : actions.filter((a) => a.effectiveTier === 'ASK').length,
        denyCount:
          typeof group.denyCount === 'number'
            ? group.denyCount
            : actions.filter((a) => a.effectiveTier === 'DENY').length,
        actions,
      };
    })
    .filter(Boolean) as AutomationGroupSummary[];

  return {
    schemaId: typeof obj.schemaId === 'string' ? obj.schemaId : undefined,
    coldStartActionKeys: ensureArray<string>(obj.coldStartActionKeys),
    groups,
  };
}

function normalizeAutomationTierCounts(
  raw: unknown,
  catalog: AutomationAuthorizationCatalog,
): TravelStatusAutomation['tierCounts'] {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (
      typeof obj.auto === 'number' &&
      typeof obj.ask === 'number' &&
      typeof obj.deny === 'number'
    ) {
      return { auto: obj.auto, ask: obj.ask, deny: obj.deny };
    }
  }
  return {
    auto: countCatalogByTier(catalog, 'AUTO'),
    ask: countCatalogByTier(catalog, 'ASK'),
    deny: countCatalogByTier(catalog, 'DENY'),
  };
}

function defaultLevelLabel(level: AutomationDefaultLevel): string {
  const uiLevel = apiLevelToUiLevel(level);
  return AUTOMATION_UI_LEVEL_MAP[uiLevel].label;
}

export function normalizeAutomation(raw: unknown): TravelStatusAutomation {
  const emptyCatalog: AutomationAuthorizationCatalog = { groups: [] };

  if (!raw || typeof raw !== 'object') {
    const defaultLevel: AutomationDefaultLevel = 'SUGGEST';
    const uiLevel = apiLevelToUiLevel(defaultLevel);
    return {
      defaultLevel,
      defaultLevelLabel: defaultLevelLabel(defaultLevel),
      uiLevel,
      uiLevelLabel: AUTOMATION_UI_LEVEL_MAP[uiLevel].label,
      tierCounts: { auto: 0, ask: 0, deny: 0 },
      paused: false,
      catalog: emptyCatalog,
    };
  }
  const obj = raw as Record<string, unknown>;
  const level = obj.defaultLevel;
  const validLevel: AutomationDefaultLevel =
    level === 'INFORM_ONLY' ||
    level === 'SUGGEST' ||
    level === 'AUTO_REPAIR_LOW_RISK' ||
    level === 'AUTO_EXECUTE_CONDITIONAL'
      ? level
      : 'SUGGEST';

  const catalog = normalizeAutomationCatalog(obj.catalog);
  const uiLevel = parseAutomationUiLevel(obj.uiLevel) ?? apiLevelToUiLevel(validLevel);
  const uiLevelLabel =
    typeof obj.uiLevelLabel === 'string'
      ? obj.uiLevelLabel
      : typeof obj.defaultLevelLabel === 'string'
        ? obj.defaultLevelLabel
        : AUTOMATION_UI_LEVEL_MAP[uiLevel].label;

  return {
    defaultLevel: validLevel,
    defaultLevelLabel:
      typeof obj.defaultLevelLabel === 'string'
        ? obj.defaultLevelLabel
        : defaultLevelLabel(validLevel),
    uiLevel,
    uiLevelLabel,
    tierCounts: normalizeAutomationTierCounts(obj.tierCounts, catalog),
    paused: obj.paused === true,
    scope: obj.scope === 'USER_TEMPLATE' ? 'USER_TEMPLATE' : obj.scope === 'TRIP' ? 'TRIP' : undefined,
    catalog,
  };
}

function normalizePendingVerification(raw: unknown): TravelStatusPendingVerification | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const items = ensureArray<{ id: string; label: string; summary?: string }>(obj.items).filter(
    (item) => item && typeof item.id === 'string',
  );
  if (items.length === 0) return undefined;
  return { items };
}

function normalizeContextSnapshot(raw: unknown): ContextSnapshotRef {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    snapshotId: typeof obj.snapshotId === 'string' ? obj.snapshotId : undefined,
    revision: typeof obj.revision === 'number' ? obj.revision : undefined,
    detailHref: typeof obj.detailHref === 'string' ? obj.detailHref : undefined,
  };
}

/** 防御性归一化 BFF travel-status 响应，避免非数组字段导致渲染崩溃 */
export function normalizeTravelStatusResponse(raw: unknown): TravelStatusResponse {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    executability: normalizeExecutability(root.executability),
    aiCompletedWork: normalizeAiCompletedWork(root.aiCompletedWork),
    openDecisions: normalizeOpenDecisions(root.openDecisions, root),
    monitoring: normalizeMonitoring(root.monitoring),
    effectivePlan: normalizeEffectivePlan(root.effectivePlan),
    automation: normalizeAutomation(root.automation),
    pendingVerification: normalizePendingVerification(root.pendingVerification),
    contextSnapshot: normalizeContextSnapshot(root.contextSnapshot),
  };
}
