import type { ReactNode } from 'react';
import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Check,
  ChevronDown,
  Circle,
  Settings2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecuteTimelineRailSnapshot } from '@/lib/execute-center.util';
import { executeCenterUi } from './execute-center-ui';
import { executeTimelineUi } from './execute-sidebar-ui';
import { ExecuteRouteMap, type ExecuteRouteMapPoint } from './ExecuteRouteMap';

export interface ExecuteTodayItineraryPanelProps {
  dayNumber: number;
  currentDate?: string;
  windWarningLabel?: string;
  timelineRail: ExecuteTimelineRailSnapshot;
  vehicleTimeLabel?: string;
  mapPoints: ExecuteRouteMapPoint[];
  routeCoordinates?: [number, number][];
  planBRouteCoordinates?: [number, number][];
  className?: string;
}

function formatDayHeader(dayNumber: number, currentDate?: string): string {
  if (!currentDate) return `Day ${dayNumber}`;
  const parsed = new Date(currentDate.includes('T') ? currentDate : `${currentDate}T12:00:00`);
  if (!isValid(parsed)) return `Day ${dayNumber}`;
  return `Day ${dayNumber} · ${format(parsed, 'M月d日（EEEE）', { locale: zhCN })}`;
}

function TimelineRailItem({
  icon,
  isActive,
  isLast,
  label,
  muted,
  children,
}: {
  icon: ReactNode;
  isActive?: boolean;
  isLast?: boolean;
  label: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-w-0 gap-3">
      <div className="relative flex w-7 shrink-0 flex-col items-center pt-1.5">
        {!isLast ? (
          <div
            className={cn(
              'absolute left-1/2 top-7 bottom-0 -translate-x-1/2 border-l-2',
              isActive ? 'border-border border-solid' : 'border-dashed border-border/70',
            )}
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            'relative z-[1] flex h-7 w-7 items-center justify-center rounded-full',
            isActive
              ? 'bg-foreground text-background shadow-sm'
              : 'border border-border/80 bg-muted/20 text-muted-foreground shadow-sm',
          )}
        >
          {icon}
        </div>
      </div>

      <article
        className={cn(
          'min-w-0 flex-1 rounded-xl border px-3 py-2.5 shadow-sm',
          isActive
            ? 'border-border/80 bg-muted/15 ring-1 ring-inset ring-border/30'
            : 'border-border/70 bg-card',
          muted && !isActive && 'border-dashed bg-card',
        )}
      >
        <p
          className={cn(
            'mb-1.5 text-[10px] font-medium',
            isActive ? 'text-foreground font-semibold' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        {children}
      </article>
    </div>
  );
}

export function ExecuteTodayItineraryPanel({
  dayNumber,
  currentDate,
  windWarningLabel,
  timelineRail,
  vehicleTimeLabel,
  mapPoints,
  routeCoordinates,
  planBRouteCoordinates,
  className,
}: ExecuteTodayItineraryPanelProps) {
  const dayHeader = formatDayHeader(dayNumber, currentDate);
  const { current, next, gathering } = timelineRail;

  const gatheringLine =
    gathering.time || gathering.place
      ? [gathering.time, gathering.place ? `于${gathering.place}集合` : null].filter(Boolean).join(' ')
      : null;

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col',
        className,
      )}
      data-section="execute-itinerary-panel"
    >
      <header className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5 border-b border-border/70 bg-card sm:px-3 sm:py-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">今日行程</h2>
          <span className={cn(executeTimelineUi.stepMeta, 'truncate')}> / {dayHeader}</span>
          {windWarningLabel ? (
            <Badge variant="outline" className={cn(executeTimelineUi.badge, executeCenterUi.badgeDanger)}>
              {windWarningLabel}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px] font-normal text-muted-foreground"
          >
            时间轴视图
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="行程设置">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(280px,34%)_1fr] min-h-[220px]">
        <div
          className="flex h-full min-h-0 flex-col gap-3 border-b md:border-b-0 md:border-r border-border/70 bg-card p-2.5 sm:p-3 overflow-y-auto"
          data-section="execute-timeline-rail"
        >
          <TimelineRailItem
            icon={<Check className="h-3 w-3" strokeWidth={3} />}
            isActive
            label="当前进行中"
            muted={current.isPlaceholder}
          >
            <p
              className={cn(
                executeTimelineUi.stepTitle,
                'text-xs font-semibold leading-snug break-words',
                current.isPlaceholder && 'font-normal text-muted-foreground',
              )}
            >
              {current.routeLabel}
            </p>
            {current.arrivalEta ? (
              <p className="mt-1 leading-snug">
                <span className={executeTimelineUi.stepMeta}>预计到达 </span>
                <span className={executeTimelineUi.stepHighlight}>{current.arrivalEta}</span>
              </p>
            ) : null}
          </TimelineRailItem>

          <TimelineRailItem
            icon={<Circle className="h-2.5 w-2.5 fill-slate-600 stroke-none" />}
            label="下一项活动"
            muted={next.isPlaceholder}
          >
            <p
              className={cn(
                executeTimelineUi.stepTitle,
                'text-xs font-semibold leading-snug break-words',
                next.isPlaceholder && 'font-normal text-muted-foreground',
              )}
            >
              {next.activityLabel}
            </p>
            <div className="mt-1 flex items-start justify-between gap-2 min-w-0">
              {next.startTimeLabel ? (
                <span className={cn(executeTimelineUi.stepMeta, 'tabular-nums leading-snug min-w-0')}>
                  预计开始 {next.startTimeLabel}
                </span>
              ) : (
                <span className={cn(executeTimelineUi.stepMeta, 'whitespace-nowrap')}>时间待确认</span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  executeTimelineUi.badge,
                  next.statusLabel === '待确认'
                    ? 'border-border/80 bg-muted/15 text-muted-foreground'
                    : executeCenterUi.badgeWarning,
                )}
              >
                {next.statusLabel}
              </Badge>
            </div>
          </TimelineRailItem>

          <TimelineRailItem
            icon={<Users className="h-3 w-3" />}
            isLast
            label="集合与分流"
            muted={gathering.isPlaceholder}
          >
            {gatheringLine ? (
              <p className={cn(executeTimelineUi.stepTitle, 'text-xs leading-snug break-words font-normal')}>{gatheringLine}</p>
            ) : (
              <p className={cn(executeTimelineUi.stepMeta, 'leading-snug')}>集合安排待同步</p>
            )}
            {gathering.destination ? (
              <p className={cn('mt-1 flex items-start gap-1 min-w-0', executeTimelineUi.stepMeta)}>
                <Users className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                <span className="leading-snug break-words">{gathering.destination}</span>
              </p>
            ) : null}
          </TimelineRailItem>
        </div>

        <div className="p-1.5 sm:p-2 bg-muted/5 min-w-0 min-h-0 flex flex-col">
          <div data-section="execute-route-map" className="h-full min-h-[180px] flex-1">
            <ExecuteRouteMap
              points={mapPoints}
              routeCoordinates={routeCoordinates}
              planBRouteCoordinates={planBRouteCoordinates}
              height="100%"
              showLegend
              vehicleTimeLabel={vehicleTimeLabel}
              className="h-full min-h-[180px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
