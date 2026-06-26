import type { EnvironmentEventSummary } from '@/types/in-trip-execution';
import type { TodayDashboardSnapshot } from '@/types/in-trip-execution';
import type { TripState } from '@/types/trip';
import type { PredictedStateResponse } from '@/types/optimization-v2';
import type {
  ExecutionAlternativeDto,
  ExecutionVerdictStatus,
  TripExecutionAdvisoryDto,
} from '@/types/trip-execution-advisory';
import { format } from 'date-fns';

function parseDelayMinutes(
  tripState: TripState | null | undefined,
  today: TodayDashboardSnapshot | null | undefined,
): number {
  const deviations = today?.timeline?.deviations;
  if (Array.isArray(deviations) && deviations.length > 0) {
    const first = deviations[0] as { delayMinutes?: number; minutes?: number };
    if (typeof first.delayMinutes === 'number') return first.delayMinutes;
    if (typeof first.minutes === 'number') return first.minutes;
  }
  return 0;
}

function buildAffectedItems(
  today: TodayDashboardSnapshot,
  tripState: TripState | null | undefined,
): TripExecutionAdvisoryDto['impacts']['affectedItems'] {
  const planned = today.timeline?.planned ?? [];
  const actual = today.timeline?.actual ?? [];
  const completedIds = new Set(actual.map((a) => a.id));
  const activeId = tripState?.currentItemId ?? tripState?.nextStop?.itemId;

  return planned.map((item) => {
    let status: 'completed' | 'active' | 'upcoming' | 'at_risk' = 'upcoming';
    if (completedIds.has(item.id)) status = 'completed';
    else if (item.id === activeId) status = 'active';

    const isNext = tripState?.nextStop?.itemId === item.id;
    const projectedArrival = isNext
      ? tripState?.nextStop?.estimatedArrivalTime ?? tripState?.eta
      : undefined;

    const delay = parseDelayMinutes(tripState, today);
    if (status === 'upcoming' && delay >= 30) status = 'at_risk';

    return {
      itemId: item.id,
      title: item.title,
      status,
      projectedArrival,
      note:
        status === 'at_risk' && projectedArrival
          ? '预计到达可能晚于建议窗口'
          : undefined,
    };
  });
}

function buildRecommendations(
  events: EnvironmentEventSummary[],
  delayMinutes: number,
): ExecutionAlternativeDto[] {
  const fromEvents: ExecutionAlternativeDto[] = [];
  for (const event of events) {
    if (event.alternativePlanCount > 0) {
      fromEvents.push({
        id: `event-${event.id}`,
        label: event.description.slice(0, 40),
        description: event.description,
        isRecommended: true,
        actionType: 'replace',
      });
    }
  }

  if (fromEvents.length > 0) {
    return [
      ...fromEvents.slice(0, 2),
      {
        id: 'keep-plan',
        label: '保持原计划',
        description: '继续按当前安排执行，接受可能的延误风险',
        actionType: 'keep',
      },
    ].slice(0, 3);
  }

  if (delayMinutes >= 20) {
    return [
      {
        id: 'shorten-stay',
        label: '缩短当前停留',
        description: '减少当前景点停留时间，尽量保留后续安排',
        isRecommended: true,
        impactSummary: '节省约 30 分钟',
        actionType: 'shorten',
      },
      {
        id: 'skip-last',
        label: '取消最后一站',
        description: '跳过后续景点，降低赶路风险',
        impactSummary: '降低赶路风险',
        actionType: 'skip',
      },
      {
        id: 'keep-plan',
        label: '保持原计划',
        description: '继续按当前安排执行',
        actionType: 'keep',
      },
    ];
  }

  return [
    {
      id: 'keep-plan',
      label: '保持原计划',
      description: '当前进度正常，可继续执行',
      isRecommended: true,
      actionType: 'keep',
    },
  ];
}

function resolveExecutionVerdict(
  delayMinutes: number,
  openEvents: EnvironmentEventSummary[],
  predicted?: PredictedStateResponse | null,
): { status: ExecutionVerdictStatus; headline: string } {
  const criticalEvent = openEvents.find((e) => e.severity === 'red');
  if (criticalEvent) {
    return {
      status: 'REPLAN_REQUIRED',
      headline: criticalEvent.description,
    };
  }

  const feasibilityProb = predicted?.feasibility?.probability;
  if (feasibilityProb != null && feasibilityProb < 0.4) {
    return {
      status: 'STOP',
      headline: '当前条件下不建议继续按原计划执行',
    };
  }

  if (delayMinutes >= 45) {
    return {
      status: 'REPLAN_REQUIRED',
      headline: `预计晚 ${delayMinutes} 分钟，最后一站可能无法完成`,
    };
  }

  if (delayMinutes >= 15 || openEvents.length > 0) {
    return {
      status: 'AT_RISK',
      headline:
        delayMinutes > 0
          ? `预计晚 ${delayMinutes} 分钟，部分站点存在风险`
          : '当前计划存在实时风险，建议查看调整方案',
    };
  }

  return {
    status: 'ON_TRACK',
    headline: '今日计划可继续执行',
  };
}

function buildRouteSummary(today: TodayDashboardSnapshot): string | undefined {
  const titles = today.timeline?.planned?.map((p) => p.title).filter(Boolean);
  if (!titles || titles.length === 0) return undefined;
  if (titles.length <= 4) return titles.join(' → ');
  return `${titles.slice(0, 3).join(' → ')} → …`;
}

function buildDeviationNarratives(
  delayMinutes: number,
  predicted?: PredictedStateResponse | null,
): TripExecutionAdvisoryDto['deviations'] {
  const items: TripExecutionAdvisoryDto['deviations'] = [];
  if (delayMinutes > 0) {
    items.push({
      id: 'delay',
      message: `实际出发晚了 ${delayMinutes} 分钟`,
      minutesImpact: delayMinutes,
    });
  }
  if (predicted?.feasibility?.riskFactors?.length) {
    predicted.feasibility.riskFactors.slice(0, 2).forEach((factor, i) => {
      items.push({ id: `risk-${i}`, message: factor });
    });
  }
  if (predicted?.weather?.precipitationProbability > 0.3) {
    items.push({
      id: 'weather',
      message: `${Math.round(predicted.weather.precipitationProbability * 100)}% 概率降雨`,
    });
  }
  return items;
}

export function buildTripExecutionAdvisory(
  tripId: string,
  today: TodayDashboardSnapshot,
  options?: {
    tripState?: TripState | null;
    environmentEvents?: EnvironmentEventSummary[];
    predicted?: PredictedStateResponse | null;
  },
): TripExecutionAdvisoryDto {
  const tripState = options?.tripState;
  const openEvents =
    options?.environmentEvents?.filter(
      (e) => e.status === 'open' || e.status === 'voting',
    ) ?? [];
  const delayMinutes = parseDelayMinutes(tripState, today);
  const verdict = resolveExecutionVerdict(delayMinutes, openEvents, options?.predicted);
  const affectedItems = buildAffectedItems(today, tripState);
  const recommendations = buildRecommendations(openEvents, delayMinutes);

  const readiness = today.todayReadiness;
  const technicalFindings =
    readiness && readiness.source === 'readiness_engine'
      ? readiness.topFindings?.map((f) => ({
          id: f.id,
          type: f.type,
          message: f.message,
          score: readiness.score,
        }))
      : undefined;

  const now = tripState?.now ?? new Date().toISOString();
  const validUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  let weatherLabel = today.weather?.summary ?? '—';
  if (options?.predicted?.weather?.precipitationProbability > 0.25) {
    weatherLabel = `${Math.round(
      options.predicted.weather.precipitationProbability * 100,
    )}% 概率降雨`;
  }

  return {
    tripId,
    dayNumber: today.dayNumber,
    date: today.date,
    routeSummary: buildRouteSummary(today),
    currentState: {
      currentTime: now,
      delayMinutes,
      activeItemId: tripState?.currentItemId,
      currentLocation:
        tripState?.nextStop?.Place?.latitude != null &&
        tripState?.nextStop?.Place?.longitude != null
          ? {
              lat: tripState.nextStop.Place.latitude!,
              lng: tripState.nextStop.Place.longitude!,
            }
          : undefined,
    },
    verdict: {
      status: verdict.status,
      headline: verdict.headline,
      validUntil,
    },
    impacts: {
      affectedItems,
      drivingAfterDarkRisk:
        delayMinutes >= 30
          ? Math.min(0.85, 0.2 + delayMinutes / 100)
          : undefined,
    },
    deviations: buildDeviationNarratives(delayMinutes, options?.predicted),
    recommendations,
    realtimeRisks: {
      road: openEvents.some((e) => e.type === 'traffic') ? '有变化' : '正常',
      weather: weatherLabel,
      openingHours: '已确认',
      nextCheckAt: format(new Date(Date.now() + 30 * 60 * 1000), 'HH:mm'),
    },
    evidence: {
      weatherAsOf: options?.predicted?.predictedAt ?? today.weather?.source,
      roadAsOf: openEvents[0]?.detectedAt,
    },
    technicalFindings,
  };
}

export function executionVerdictLabel(status: ExecutionVerdictStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return '正常进行';
    case 'AT_RISK':
      return '需要关注';
    case 'REPLAN_REQUIRED':
      return '需要调整';
    case 'STOP':
      return '不建议继续';
    default:
      return '待确认';
  }
}
