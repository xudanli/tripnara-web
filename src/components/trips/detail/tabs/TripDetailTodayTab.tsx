import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InTripTodayPanel } from '@/components/in-trip';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DayExecutabilityPanel,
  ExecutionStatusBadge,
} from '@/components/trip-world-state';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { useInTripToday } from '@/hooks/useInTripToday';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { buildDayExecutabilityMap } from '@/lib/day-executability.util';
import { buildTripExecutePath } from '@/lib/trip-detail-navigation.util';
import { resolveTodayTripDay, formatTodayHeadline } from '@/lib/trip-today.util';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import { cn } from '@/lib/utils';
import {
  TripDetailSection,
  TripDetailTwoColumn,
  tripDetailUi,
} from '../trip-detail-ui';
import type { TripDetail } from '@/types/trip';

interface TripDetailTodayTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenDecisions?: () => void;
  onOpenMonitoring?: () => void;
  onOpenBudget?: () => void;
}

function formatItemTime(timeStr: string) {
  try {
    return format(new Date(timeStr), 'HH:mm');
  } catch {
    return timeStr;
  }
}

/** 行中 Today 模式 — 今日概览 + 可执行状态 + 进入完整行中控制台 */
export default function TripDetailTodayTab({
  tripId,
  trip,
  onOpenDecisions,
  onOpenMonitoring,
  onOpenBudget,
}: TripDetailTodayTabProps) {
  const navigate = useNavigate();
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();
  const { data, loading, error, disabled, notAvailable, reload } = useInTripToday(
    tripId,
    trip.status === 'IN_PROGRESS',
  );
  const { status: travelStatus } = useTripStatusBarModel(tripId, trip.status === 'IN_PROGRESS');

  const todayView = resolveTodayTripDay(trip);
  const dayExecutability = todayView
    ? buildDayExecutabilityMap(travelStatus).get(todayView.dayNumber)
    : undefined;

  const fallbackItems = todayView?.day.ItineraryItem ?? [];
  const todayAlerts =
    travelStatus?.monitoring?.items?.filter(
      (item) => item.status === 'ALERT' || item.status === 'ACTIVE',
    ) ?? [];

  const headline = data
    ? `第 ${data.dayNumber} 天 · 行中今日`
    : todayView
      ? `${formatTodayHeadline(todayView)} · 今日`
      : '今日';

  const handleAskAi = useCallback(() => {
    openAssistant();
    void sendAssistantMessage('今天行程有什么需要注意的？');
  }, [openAssistant, sendAssistantMessage]);

  const handleRecordExpense = useCallback(() => {
    if (onOpenBudget) {
      onOpenBudget();
      return;
    }
    navigate(buildTripExecutePath(tripId));
  }, [onOpenBudget, navigate, tripId]);

  if (trip.status !== 'IN_PROGRESS') {
    return (
      <TripDetailSection title="今日">
        <p className="text-sm text-muted-foreground py-4">行程尚未开始，开始执行后可在此查看今日视图。</p>
      </TripDetailSection>
    );
  }

  const showFallbackPanel = !loading && (notAvailable || disabled) && todayView;

  return (
    <TripDetailTwoColumn
      main={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{headline}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                轻量今日视图 · 完整行中能力请进入控制台
              </p>
            </div>
            <Button size="sm" onClick={() => navigate(buildTripExecutePath(tripId))}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              行中控制台
            </Button>
          </div>

          {!disabled && !notAvailable ? (
            <InTripTodayPanel
              tripId={tripId}
              data={data}
              loading={loading}
              error={error}
              onAskAi={handleAskAi}
              onEnvironmentAlertsClick={onOpenMonitoring}
              onRecordExpense={handleRecordExpense}
              onInterventionsClick={onOpenMonitoring}
              onExperiencePulsesClick={() => navigate(buildTripExecutePath(tripId))}
            />
          ) : loading ? (
            <div className="flex justify-center py-12">
              <LogoLoading size={32} />
            </div>
          ) : null}

          {showFallbackPanel ? (
            <section className={cn(tripDetailUi.card, 'p-4 space-y-3')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">今日行程</span>
                {dayExecutability ? (
                  <ExecutionStatusBadge
                    label={dayExecutability.label}
                    status={dayExecutability.status}
                  />
                ) : (
                  <Badge variant="outline" className={tripDetailUi.tagVerified}>
                    可执行
                  </Badge>
                )}
              </div>
              {fallbackItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">今日暂无行程安排</p>
              ) : (
                <ul className="space-y-2">
                  {fallbackItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="font-medium truncate">
                        {resolveItineraryItemPlaceDisplayName(item) || item.note || '行程项'}
                      </span>
                      {item.startTime ? (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatItemTime(item.startTime)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                行中 BFF 暂不可用，以上为计划行程 fallback。
                <button type="button" className="ml-1 underline" onClick={() => void reload()}>
                  重试
                </button>
              </p>
            </section>
          ) : null}

          {dayExecutability ? (
            <DayExecutabilityPanel view={dayExecutability} onViewAlternatives={onOpenDecisions} />
          ) : null}
        </div>
      }
      sidebar={
        <>
          <TripDetailSection title="今日风险">
            {todayAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无活跃告警</p>
            ) : (
              <ul className="space-y-2">
                {todayAlerts.slice(0, 4).map((item) => (
                  <li
                    key={`${item.kind}-${item.label}`}
                    className="rounded-lg border border-gate-confirm-border/40 bg-gate-confirm/5 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-foreground">{item.label}</p>
                    {item.summary ? (
                      <p className="mt-0.5 text-muted-foreground">{item.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {onOpenMonitoring ? (
              <Button variant="link" size="sm" className="mt-2 h-auto px-0 text-xs" onClick={onOpenMonitoring}>
                查看监控中心
              </Button>
            ) : null}
          </TripDetailSection>

          <TripDetailSection title="快捷操作">
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start h-9" onClick={handleAskAi}>
                问 AI · 今日注意什么
              </Button>
              <Button variant="outline" size="sm" className="justify-start h-9" onClick={handleRecordExpense}>
                记一笔支出
              </Button>
              {onOpenDecisions ? (
                <Button variant="outline" size="sm" className="justify-start h-9" onClick={onOpenDecisions}>
                  待处理决策
                </Button>
              ) : null}
            </div>
          </TripDetailSection>

          {dayExecutability?.status === 'blocked' && onOpenDecisions ? (
            <TripDetailSection title="需要处理">
              <p className="text-sm text-muted-foreground">今日存在阻断项，建议先在决策中心处理。</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onOpenDecisions}>
                前往决策中心
              </Button>
            </TripDetailSection>
          ) : null}
        </>
      }
    />
  );
}
