/**
 * 执行阶段 - 今日行程时间线（垂直轴样式）
 */

import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatScheduleTimeRange } from '@/lib/itinerary-item-card-format';
import { executeCenterUi } from '@/components/execute/live/execute-center-ui';
import type { TripDetail, TripState, ScheduleResponse, ScheduleItem } from '@/types/trip';

function parseDayDate(dateStr: string): Date | null {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  return isValid(d) ? d : null;
}

function toDateKey(dateStr: string): string | null {
  const d = parseDayDate(dateStr);
  return d ? format(d, 'yyyy-MM-dd') : null;
}

function formatClock(value?: string): string {
  if (!value) return '--:--';
  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, 'HH:mm') : value;
}

type TimelineStatus = 'done' | 'current' | 'upcoming';

function resolveTimelineStatus(idx: number, currentIdx: number): TimelineStatus {
  if (currentIdx < 0) return 'upcoming';
  if (idx < currentIdx) return 'done';
  if (idx === currentIdx) return 'current';
  return 'upcoming';
}

function statusBadge(status: TimelineStatus) {
  switch (status) {
    case 'done':
      return { label: '已完成', className: executeCenterUi.badgeSuccess };
    case 'current':
      return { label: '进行中', className: executeCenterUi.badgeWarning };
    default:
      return { label: '待定', className: executeCenterUi.badgeNeutral };
  }
}

function TimelineNode({ status }: { status: TimelineStatus }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground shrink-0" aria-hidden />;
  }
  if (status === 'current') {
    return <span className="h-3 w-3 rounded-full bg-gate-reject-foreground ring-4 ring-gate-reject/20 shrink-0" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />;
}

function VerticalTimelineList({
  items,
  currentPlaceId,
  nextPlaceId,
  formatPlaceName,
  findPlaceById,
}: {
  items: ScheduleItem[];
  currentPlaceId?: number | null;
  nextPlaceId?: number | null;
  formatPlaceName: (a: string, b?: { nameCN?: string; nameEN?: string | null }) => string;
  findPlaceById: (id: number) => { nameCN?: string; nameEN?: string | null } | undefined;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Calendar className="w-10 h-10 mb-2 opacity-50" />
        <p className="text-sm font-medium">暂无今日安排</p>
      </div>
    );
  }

  const currentIdx =
    currentPlaceId != null ? items.findIndex((item) => item.placeId === currentPlaceId) : -1;
  const effectiveCurrentIdx =
    currentIdx >= 0
      ? currentIdx
      : nextPlaceId != null
        ? items.findIndex((i) => i.placeId === nextPlaceId)
        : -1;

  return (
    <ol className="relative space-y-0">
      {items.map((item, idx) => {
        const status = resolveTimelineStatus(idx, effectiveCurrentIdx);
        const badge = statusBadge(status);
        const subtitle =
          item.endTime && item.startTime
            ? formatScheduleTimeRange(item.startTime, item.endTime)
            : undefined;

        return (
          <li key={`${item.placeId}-${idx}`} className="relative flex gap-3 pb-4 last:pb-0">
            {idx < items.length - 1 ? (
              <span className="absolute left-[7px] top-5 bottom-0 w-px bg-border" aria-hidden />
            ) : null}
            <div className="pt-0.5 z-[1] bg-card">
              <TimelineNode status={status} />
            </div>
            <div
              className={cn(
                'flex-1 min-w-0 rounded-xl border px-3 py-2.5',
                status === 'current' && executeCenterUi.timelineCurrent,
                status === 'done' && executeCenterUi.timelineDone,
                status === 'upcoming' && 'border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatClock(item.startTime)}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground leading-snug">
                    {formatPlaceName(item.placeName, findPlaceById(item.placeId))}
                  </p>
                  {subtitle ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className={cn('text-[10px] h-5 shrink-0', badge.className)}>
                  {badge.label}
                </Badge>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export interface ExecuteItineraryTimelineProps {
  trip: TripDetail | null;
  tripState: TripState | null;
  todaySchedule: ScheduleResponse | null;
  dayNumber: number;
  currentDate?: string;
  windWarningLabel?: string;
  formatPlaceName: (placeName: string, place?: { nameCN?: string; nameEN?: string | null }) => string;
  findPlaceById: (placeId: number) => { nameCN?: string; nameEN?: string | null } | undefined;
  className?: string;
}

export function ExecuteItineraryTimeline({
  trip,
  tripState,
  todaySchedule,
  dayNumber,
  currentDate,
  windWarningLabel,
  formatPlaceName,
  findPlaceById,
  className,
}: ExecuteItineraryTimelineProps) {
  const todayItems = todaySchedule?.schedule?.items ?? [];
  const currentItemId = tripState?.currentItemId;
  const nextPlaceId = tripState?.nextStop?.placeId ?? undefined;

  const currentPlaceId = (() => {
    if (!currentItemId || !trip?.TripDay || !todaySchedule?.date) return undefined;
    const todayKey = toDateKey(todaySchedule.date);
    const todayDay = todayKey
      ? trip.TripDay.find((d) => toDateKey(d.date) === todayKey)
      : undefined;
    const item = todayDay?.ItineraryItem?.find((i) => i.id === currentItemId);
    return item?.placeId ?? undefined;
  })();

  const dayHeader = (() => {
    if (!currentDate) return `Day ${dayNumber}`;
    const d = parseDayDate(currentDate);
    return d
      ? `Day ${dayNumber} · ${format(d, 'M月d日（EEEE）', { locale: zhCN })}`
      : `Day ${dayNumber}`;
  })();

  return (
    <section className={cn(executeCenterUi.card, className)} data-tour="itinerary-timeline">
      <div className={cn(executeCenterUi.cardHeader, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={executeCenterUi.sectionTitle}>今日行程</h3>
            <span className={executeCenterUi.sectionSub}>/ {dayHeader}</span>
            {windWarningLabel ? (
              <Badge variant="outline" className={cn('text-[10px] h-5', executeCenterUi.badgeDanger)}>
                {windWarningLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs h-8 px-2.5 font-normal">
            时间轴视图
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="行程设置">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <div className={cn(executeCenterUi.cardBody, 'overflow-y-auto')}>
        <h4 className="text-sm font-semibold text-foreground mb-3">今日行程时间线</h4>
        <VerticalTimelineList
          items={todayItems}
          currentPlaceId={currentPlaceId}
          nextPlaceId={nextPlaceId}
          formatPlaceName={formatPlaceName}
          findPlaceById={findPlaceById}
        />
      </div>
    </section>
  );
}
