import type {
  AiActivityLogDetailResponse,
  AiActivityLogFilterTag,
  AiActivityLogListResponse,
  AiActivityLogSummary,
  AiActivityLogTimelineItem,
} from '@/api/ai-activity-log.types';

const FILTER_TAGS: AiActivityLogFilterTag[] = [
  'ALL',
  'AUTO',
  'WAITING_CONFIRM',
  'WRITTEN_BACK',
  'CANCELLED',
];

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function normalizeFilterTags(raw: unknown): AiActivityLogFilterTag[] {
  const tags = ensureArray<string>(raw).filter((tag): tag is AiActivityLogFilterTag =>
    FILTER_TAGS.includes(tag as AiActivityLogFilterTag),
  );
  return tags.length ? tags : ['ALL'];
}

function normalizeTimelineItem(raw: unknown): AiActivityLogTimelineItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const activityId = typeof obj.activityId === 'string' ? obj.activityId : null;
  const occurredAt = typeof obj.occurredAt === 'string' ? obj.occurredAt : null;
  const title = typeof obj.title === 'string' ? obj.title : null;
  if (!activityId || !occurredAt || !title) return null;

  return {
    activityId,
    eventId: typeof obj.eventId === 'string' ? obj.eventId : undefined,
    occurredAt,
    category: typeof obj.category === 'string' ? obj.category : 'OTHER',
    categoryLabel: typeof obj.categoryLabel === 'string' ? obj.categoryLabel : undefined,
    filterTags: normalizeFilterTags(obj.filterTags),
    statusTag: typeof obj.statusTag === 'string' ? obj.statusTag : 'OTHER',
    statusLabel: typeof obj.statusLabel === 'string' ? obj.statusLabel : '—',
    title,
    reason: typeof obj.reason === 'string' ? obj.reason : undefined,
    problemId: typeof obj.problemId === 'string' ? obj.problemId : undefined,
    automatic: obj.automatic === true,
    reversible: obj.reversible === true,
    actions:
      obj.actions && typeof obj.actions === 'object'
        ? (obj.actions as AiActivityLogTimelineItem['actions'])
        : undefined,
    detailHref: typeof obj.detailHref === 'string' ? obj.detailHref : undefined,
  };
}

function normalizeSummary(raw: unknown): AiActivityLogSummary {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const latestRaw =
    obj.latestRevalidation && typeof obj.latestRevalidation === 'object'
      ? (obj.latestRevalidation as Record<string, unknown>)
      : null;

  return {
    todayActionCount:
      typeof obj.todayActionCount === 'number' ? obj.todayActionCount : 0,
    todayActionDelta:
      typeof obj.todayActionDelta === 'number' ? obj.todayActionDelta : undefined,
    autoCompletedCount:
      typeof obj.autoCompletedCount === 'number' ? obj.autoCompletedCount : 0,
    autoCompletedPct:
      typeof obj.autoCompletedPct === 'number' ? obj.autoCompletedPct : undefined,
    waitingConfirmCount:
      typeof obj.waitingConfirmCount === 'number' ? obj.waitingConfirmCount : 0,
    waitingConfirmPct:
      typeof obj.waitingConfirmPct === 'number' ? obj.waitingConfirmPct : undefined,
    latestRevalidation: latestRaw
      ? {
          activityId:
            typeof latestRaw.activityId === 'string' ? latestRaw.activityId : '',
          occurredAt:
            typeof latestRaw.occurredAt === 'string' ? latestRaw.occurredAt : undefined,
          title: typeof latestRaw.title === 'string' ? latestRaw.title : undefined,
          feasibilityScoreBefore:
            typeof latestRaw.feasibilityScoreBefore === 'number'
              ? latestRaw.feasibilityScoreBefore
              : undefined,
          feasibilityScoreAfter:
            typeof latestRaw.feasibilityScoreAfter === 'number'
              ? latestRaw.feasibilityScoreAfter
              : undefined,
        }
      : null,
  };
}

export function normalizeAiActivityLogList(raw: unknown): AiActivityLogListResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的 ai-activity-log 响应');
  }
  const obj = raw as Record<string, unknown>;
  const items = ensureArray<unknown>(obj.items)
    .map(normalizeTimelineItem)
    .filter(Boolean) as AiActivityLogTimelineItem[];

  return {
    schemaId: typeof obj.schemaId === 'string' ? obj.schemaId : undefined,
    tripId: typeof obj.tripId === 'string' ? obj.tripId : '',
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : undefined,
    summary: normalizeSummary(obj.summary),
    filters: normalizeFilterTags(obj.filters ?? FILTER_TAGS),
    items,
  };
}

export function normalizeAiActivityLogDetail(raw: unknown): AiActivityLogDetailResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的 ai-activity-log 详情响应');
  }
  const obj = raw as Record<string, unknown>;
  const activityId = typeof obj.activityId === 'string' ? obj.activityId : '';
  const title = typeof obj.title === 'string' ? obj.title : '';
  if (!activityId || !title) {
    throw new Error('ai-activity-log 详情缺少 activityId 或 title');
  }

  const evidence = ensureArray<unknown>(obj.evidence)
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const label = typeof item.label === 'string' ? item.label : null;
      if (!label) return null;
      return {
        label,
        detail: typeof item.detail === 'string' ? item.detail : undefined,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
      };
    })
    .filter(Boolean) as AiActivityLogDetailResponse['evidence'];

  const impactRaw =
    obj.impactMetrics && typeof obj.impactMetrics === 'object'
      ? (obj.impactMetrics as Record<string, unknown>)
      : null;

  const confirmedRaw =
    obj.confirmedBy && typeof obj.confirmedBy === 'object'
      ? (obj.confirmedBy as Record<string, unknown>)
      : null;

  const undoRaw =
    obj.undo && typeof obj.undo === 'object' ? (obj.undo as Record<string, unknown>) : null;

  return {
    schemaId: typeof obj.schemaId === 'string' ? obj.schemaId : undefined,
    tripId: typeof obj.tripId === 'string' ? obj.tripId : '',
    activityId,
    eventId: typeof obj.eventId === 'string' ? obj.eventId : undefined,
    occurredAt: typeof obj.occurredAt === 'string' ? obj.occurredAt : undefined,
    category: typeof obj.category === 'string' ? obj.category : undefined,
    categoryLabel: typeof obj.categoryLabel === 'string' ? obj.categoryLabel : undefined,
    statusTag: typeof obj.statusTag === 'string' ? obj.statusTag : undefined,
    statusLabel: typeof obj.statusLabel === 'string' ? obj.statusLabel : undefined,
    title,
    executionReason:
      typeof obj.executionReason === 'string' ? obj.executionReason : undefined,
    evidence,
    impactMetrics: impactRaw
      ? {
          feasibilityScore: readMetricPair<number>(impactRaw.feasibilityScore),
          riskLevel: readMetricPair<string>(impactRaw.riskLevel),
        }
      : undefined,
    confirmedBy: confirmedRaw
      ? {
          userId: typeof confirmedRaw.userId === 'string' ? confirmedRaw.userId : undefined,
          displayName:
            typeof confirmedRaw.displayName === 'string'
              ? confirmedRaw.displayName
              : undefined,
          occurredAt:
            typeof confirmedRaw.occurredAt === 'string'
              ? confirmedRaw.occurredAt
              : undefined,
        }
      : null,
    reversible: obj.reversible === true,
    undo: undoRaw
      ? {
          enabled: undoRaw.enabled === true,
          logId: typeof undoRaw.logId === 'string' ? undoRaw.logId : undefined,
          undoActionId:
            typeof undoRaw.undoActionId === 'string' ? undoRaw.undoActionId : undefined,
        }
      : undefined,
    problemId: typeof obj.problemId === 'string' ? obj.problemId : undefined,
    actions:
      obj.actions && typeof obj.actions === 'object'
        ? (obj.actions as AiActivityLogDetailResponse['actions'])
        : undefined,
  };
}

function readMetricPair<T extends string | number>(
  raw: unknown,
): { before?: T; after?: T } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    before: obj.before as T | undefined,
    after: obj.after as T | undefined,
  };
}
