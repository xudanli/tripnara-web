import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  AiCompletedWorkItem,
  DecisionQueueItem,
  MonitoringItem,
  TravelStatusResponse,
} from '@/api/travel-status.types';
import type { OverviewViewData } from '@/travel-context/views/overview-view.types';

export type TripConditionCardStatus = 'ready' | 'attention' | 'action' | 'monitoring';

export interface TripConditionCardItem {
  id: string;
  label: string;
  status: TripConditionCardStatus;
  statusLabel: string;
  detail?: string;
}

export interface WorldChangeFeedItem {
  id: string;
  subject: string;
  change: string;
  impact?: string;
  occurredAt?: string;
  kind: 'road' | 'weather' | 'booking' | 'activity' | 'ai' | 'decision' | 'monitor';
}

export interface TripMonitoringWatchItem {
  id: string;
  label: string;
  summary?: string;
  status?: string;
}

const CONDITION_STATUS_LABELS: Record<TripConditionCardStatus, string> = {
  ready: '已满足',
  attention: '待确认',
  action: '需要处理',
  monitoring: '持续监控',
};

function textBlob(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function cardStatusFromCounts(blockers: number, attention: number, monitoring: boolean): TripConditionCardStatus {
  if (blockers > 0) return 'action';
  if (attention > 0) return 'attention';
  if (monitoring) return 'monitoring';
  return 'ready';
}

function formatRelative(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  return formatDistanceToNow(ms, { addSuffix: true, locale: zhCN });
}

export function buildTripConditionCards(
  status: TravelStatusResponse,
  overviewView?: OverviewViewData,
): TripConditionCardItem[] {
  const decisions = status.openDecisions ?? [];
  const monitoring = status.monitoring?.items ?? [];
  const verifyCount = status.pendingVerification?.items?.length ?? 0;

  const entryDecisions = decisions.filter((d) =>
    matchesAny(textBlob([d.headline, d.impact]), [/入境/, /签证/, /visa/, /entry/i]),
  );
  const vehicleDecisions = decisions.filter((d) =>
    matchesAny(textBlob([d.headline, d.impact]), [/车辆/, /2wd/, /4wd/, /f208/, /f路/, /租车/, /road/i]),
  );
  const insuranceDecisions = decisions.filter((d) =>
    matchesAny(textBlob([d.headline, d.impact]), [/保险/, /insurance/, /涉水/, /底盘/]),
  );
  const activityDecisions = decisions.filter((d) =>
    matchesAny(textBlob([d.headline, d.impact]), [/活动/, /预约/, /booking/, /poi/i]),
  );

  const roadAlerts = monitoring.filter(
    (m) => m.kind === 'ROAD_CLOSURE' || m.kind === 'WEATHER_HAZARD' || m.status === 'ALERT',
  );
  const bookingAlerts = monitoring.filter((m) => m.kind === 'BOOKING_STATUS');

  const entryBlockers = entryDecisions.filter((d) => d.severity === 'BLOCK').length;
  const vehicleBlockers = vehicleDecisions.filter((d) => d.severity === 'BLOCK').length;
  const insuranceBlockers = insuranceDecisions.filter((d) => d.severity === 'BLOCK').length;

  const cards: TripConditionCardItem[] = [
    {
      id: 'entry',
      label: '入境条件',
      status: cardStatusFromCounts(entryBlockers, entryDecisions.length - entryBlockers, false),
      statusLabel:
        entryBlockers > 0
          ? `需要处理 ${entryBlockers} 项`
          : entryDecisions.length > 0
            ? '待确认'
            : CONDITION_STATUS_LABELS.ready,
      detail: entryDecisions[0]?.headline,
    },
    {
      id: 'mobility',
      label: '交通与车辆',
      status: cardStatusFromCounts(
        vehicleBlockers + insuranceBlockers,
        vehicleDecisions.length + insuranceDecisions.length - vehicleBlockers - insuranceBlockers,
        false,
      ),
      statusLabel:
        vehicleBlockers + insuranceBlockers > 0
          ? `需要处理 ${vehicleBlockers + insuranceBlockers} 项`
          : vehicleDecisions.length + insuranceDecisions.length > 0
            ? '待确认'
            : CONDITION_STATUS_LABELS.ready,
      detail: vehicleDecisions[0]?.headline ?? insuranceDecisions[0]?.headline,
    },
    {
      id: 'accommodation',
      label: '住宿',
      status: cardStatusFromCounts(
        0,
        bookingAlerts.filter((m) => m.status === 'ALERT').length,
        bookingAlerts.length > 0,
      ),
      statusLabel:
        bookingAlerts.some((m) => m.status === 'ALERT')
          ? '待确认'
          : bookingAlerts.length > 0
            ? CONDITION_STATUS_LABELS.monitoring
            : '已全部确认',
      detail: bookingAlerts[0]?.summary ?? bookingAlerts[0]?.label,
    },
    {
      id: 'activities',
      label: '活动预约',
      status: cardStatusFromCounts(
        activityDecisions.filter((d) => d.severity === 'BLOCK').length,
        verifyCount + activityDecisions.filter((d) => d.severity !== 'BLOCK').length,
        false,
      ),
      statusLabel:
        verifyCount > 0
          ? `${verifyCount} 项待确认`
          : activityDecisions.length > 0
            ? `${activityDecisions.length} 项待处理`
            : '基本就绪',
      detail: status.pendingVerification?.items?.[0]?.label ?? activityDecisions[0]?.headline,
    },
    {
      id: 'environment',
      label: '天气与道路',
      status: cardStatusFromCounts(
        roadAlerts.filter((m) => m.status === 'ALERT').length,
        roadAlerts.filter((m) => m.status !== 'ALERT').length,
        monitoring.length > 0,
      ),
      statusLabel:
        roadAlerts.some((m) => m.status === 'ALERT')
          ? `${roadAlerts.filter((m) => m.status === 'ALERT').length} 项需关注`
          : monitoring.length > 0
            ? CONDITION_STATUS_LABELS.monitoring
            : '正常',
      detail: roadAlerts[0]?.summary ?? roadAlerts[0]?.label,
    },
    {
      id: 'team',
      label: '人员适配',
      status: cardStatusFromCounts(0, verifyCount > 0 ? 1 : 0, false),
      statusLabel:
        overviewView?.consistencyWarning
          ? '需核对'
          : verifyCount > 0
            ? '基本合适'
            : '基本合适',
      detail: overviewView?.consistencyWarning ?? undefined,
    },
  ];

  return cards.map((c) => ({
    ...c,
    statusLabel: c.statusLabel || CONDITION_STATUS_LABELS[c.status],
  }));
}

function monitoringToChange(item: MonitoringItem, index: number): WorldChangeFeedItem | null {
  if (item.status !== 'ALERT' && !item.summary) return null;
  const kind =
    item.kind === 'ROAD_CLOSURE'
      ? 'road'
      : item.kind === 'WEATHER_HAZARD'
        ? 'weather'
        : item.kind === 'BOOKING_STATUS'
          ? 'booking'
          : 'monitor';
  return {
    id: `monitor-${item.kind}-${index}`,
    subject: item.label,
    change: item.summary ?? travelStatusMonitoringChangeFallback(item),
    impact: item.status === 'ALERT' ? '可能影响相关行程日' : undefined,
    occurredAt: item.lastCheckedAt,
    kind,
  };
}

function travelStatusMonitoringChangeFallback(item: MonitoringItem): string {
  switch (item.status) {
    case 'ALERT':
      return '状态已变化，需关注';
    case 'ACTIVE':
      return '持续监控中';
    default:
      return item.label;
  }
}

function aiWorkToChange(item: AiCompletedWorkItem): WorldChangeFeedItem {
  return {
    id: item.activityId,
    subject: 'TripNARA 已更新',
    change: item.changeSummary ?? item.summary,
    impact: item.automatic ? '自动处理' : '待你确认',
    occurredAt: item.occurredAt,
    kind: 'ai',
  };
}

function decisionToChange(item: DecisionQueueItem): WorldChangeFeedItem | null {
  if (item.severity !== 'BLOCK' && item.severity !== 'CONFLICT') return null;
  return {
    id: item.problemId,
    subject: item.headline,
    change: item.recommendation?.summary ?? item.impact,
    impact: item.affectedDayNumbers?.length
      ? `影响第 ${item.affectedDayNumbers.join('、')} 天`
      : item.impact,
    kind: 'decision',
  };
}

export function buildWorldChangeFeed(status: TravelStatusResponse, limit = 5): WorldChangeFeedItem[] {
  const fromMonitoring = (status.monitoring?.items ?? [])
    .map(monitoringToChange)
    .filter(Boolean) as WorldChangeFeedItem[];
  const fromAi = (status.aiCompletedWork?.items ?? []).slice(0, 3).map(aiWorkToChange);
  const fromDecisions = (status.openDecisions ?? [])
    .map(decisionToChange)
    .filter(Boolean) as WorldChangeFeedItem[];

  const merged = [...fromMonitoring, ...fromDecisions, ...fromAi];
  merged.sort((a, b) => {
    const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return tb - ta;
  });

  return merged.slice(0, limit);
}

export function buildTripMonitoringWatchlist(status: TravelStatusResponse): TripMonitoringWatchItem[] {
  return (status.monitoring?.items ?? []).map((item, index) => ({
    id: `${item.kind}-${index}`,
    label: item.label,
    summary: item.summary ?? travelStatusMonitoringChangeFallback(item),
    status: item.status,
  }));
}

export function conditionCardStatusTone(status: TripConditionCardStatus): string {
  switch (status) {
    case 'ready':
      return 'text-gate-allow-foreground';
    case 'monitoring':
      return 'text-muted-foreground';
    case 'attention':
      return 'text-gate-confirm-foreground';
    case 'action':
    default:
      return 'text-gate-reject-foreground';
  }
}

export function formatWorldChangeTime(iso?: string): string | undefined {
  return formatRelative(iso);
}
