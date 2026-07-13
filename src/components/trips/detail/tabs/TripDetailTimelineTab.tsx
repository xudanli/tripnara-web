import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import {
  BedDouble,
  Camera,
  Car,
  MapPin,
  Plane,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isAccommodationItineraryItem } from '@/lib/itinerary-item-sort';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import {
  formatTimelinePendingSubtext,
  TRIP_DETAIL_TERMS,
} from '@/lib/trip-detail-terminology.util';
import { resolveTimelineScoreLabel } from '@/lib/timeline-overview.util';
import type { TimelineOverviewResponse } from '@/types/timeline-overview';
import type { ItineraryItem, TripDay, TripDetail } from '@/types/trip';
import {
  TripDetailStatCard,
  tripDetailUi,
} from '../trip-detail-ui';
import {
  TimelinePlanObjectDayChain,
  TimelinePlanObjectTopAssessmentCard,
} from '../TimelinePlanObjectSection';
import type { PlanObjectDayChainDto } from '@/types/plan-objects';
import type { PlanStudioScheduleNavigateDetail } from '@/lib/plan-studio-schedule-navigation';
import { trackTripDetailPlanStudioDeeplink } from '@/utils/trip-detail-analytics';
import TripDetailTabGateSummary from '../TripDetailTabGateSummary';
import { useDecisionSurfaceAlignmentProbe } from '@/hooks/useDecisionSurfaceAlignmentProbe';
import { DecisionSurfaceAlignmentDevHint } from '@/components/plan-studio/workbench/DecisionSurfaceAlignmentDevHint';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { buildDayExecutabilityMap, type DayExecutabilityView } from '@/lib/day-executability.util';
import {
  DayExecutabilityPanel,
  ExecutionStatusBadge,
} from '@/components/trip-world-state';

function formatTime(timeStr: string) {
  try {
    return format(new Date(timeStr), 'HH:mm');
  } catch {
    return timeStr;
  }
}

function itemIcon(item: ItineraryItem) {
  if (isAccommodationItineraryItem(item)) return BedDouble;
  const note = (item.note || '').toLowerCase();
  if (note.includes('flight') || note.includes('航班')) return Plane;
  if (note.includes('drive') || note.includes('自驾') || item.travelMode) return Car;
  return Camera;
}

function itemTitle(item: ItineraryItem) {
  return resolveItineraryItemPlaceDisplayName(item) || item.note || '行程项';
}

function scoreBadgeClass(tone: ReturnType<typeof resolveTimelineScoreLabel>['tone']): string {
  if (tone === 'verified') return tripDetailUi.tagVerified;
  if (tone === 'confirm') return tripDetailUi.tagConfirm;
  return 'border-border bg-muted/40 text-muted-foreground';
}

interface TripDetailTimelineTabProps {
  trip: TripDetail;
  /** 父级 useTripDetailTabBff 预加载的 timeline-overview */
  timelineOverview: TimelineOverviewResponse | null;
  timelineOverviewLoading?: boolean;
  onAddDay?: () => void;
  onOpenPlanStudio?: (detail?: PlanStudioScheduleNavigateDetail) => void;
  onOpenFilesTab?: () => void;
  onOpenDecisions?: () => void;
  highlightItineraryItemId?: string | null;
}

function DayTimelineRow({
  day,
  dayIndex,
  planObjectDay,
  onOpenPlanStudioDay,
  highlightItineraryItemId,
  dayExecutability,
  onViewAlternatives,
}: {
  day: TripDay;
  dayIndex: number;
  planObjectDay?: PlanObjectDayChainDto;
  onOpenPlanStudioDay?: (dayNumber: number) => void;
  highlightItineraryItemId?: string | null;
  dayExecutability?: DayExecutabilityView;
  onViewAlternatives?: () => void;
}) {
  const items = day.ItineraryItem || [];
  const accommodation = items.find(isAccommodationItineraryItem);

  return (
    <div className={cn(tripDetailUi.card, 'p-2 shadow-none')} data-day-index={dayIndex}>
      <div className="grid grid-cols-1 lg:grid-cols-[96px_1fr_168px] gap-2 items-center">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-bold leading-none text-foreground">Day {dayIndex + 1}</p>
            <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(day.date), 'MM-dd')}</span>
            {dayExecutability ? (
              <ExecutionStatusBadge label={dayExecutability.label} status={dayExecutability.status} />
            ) : null}
          </div>
          {onOpenPlanStudioDay ? (
            <Button
              variant="link"
              className={cn(tripDetailUi.linkInline, 'h-auto px-0 py-0 text-[11px]')}
              onClick={() => onOpenPlanStudioDay(dayIndex + 1)}
            >
              去编辑
            </Button>
          ) : null}
          {day.theme ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 line-clamp-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {day.theme}
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">暂无行程安排</p>
            ) : (
              items.map((item, idx) => {
                const Icon = itemIcon(item);
                const isHighlighted = highlightItineraryItemId === item.id;
                return (
                  <div key={item.id} className="flex items-center">
                    <div
                      id={`trip-item-${item.id}`}
                      data-itinerary-item-id={item.id}
                      className={cn(
                        'flex flex-col items-center w-[108px] shrink-0 rounded-md px-0.5 py-0.5 transition-colors',
                        isHighlighted && 'ring-2 ring-border bg-background',
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground mb-0.5 tabular-nums">{formatTime(item.startTime)}</span>
                      <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-foreground" />
                      </div>
                      <p className="text-[11px] font-medium text-foreground mt-1 text-center line-clamp-2 px-0.5 leading-tight">
                        {itemTitle(item)}
                      </p>
                      {item.travelFromPreviousDistance ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {Math.round(item.travelFromPreviousDistance / 1000)} km
                        </p>
                      ) : null}
                    </div>
                    {idx < items.length - 1 ? (
                      <div className="flex flex-col items-center justify-center pt-5 px-0.5 shrink-0">
                        <div className="w-6 border-t border-dashed border-border" />
                        {item.travelFromPreviousDuration ? (
                          <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                            {Math.floor(item.travelFromPreviousDuration / 60)}h
                            {item.travelFromPreviousDuration % 60}m
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {onOpenPlanStudioDay ? (
          <button
            type="button"
            onClick={() => onOpenPlanStudioDay(dayIndex + 1)}
            className="rounded-md border border-border bg-card px-2 py-1.5 self-center text-left transition-colors hover:bg-muted/20"
          >
            {accommodation ? (
              <>
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 text-[10px]',
                      accommodation.bookingStatus === 'BOOKED'
                        ? tripDetailUi.tagVerified
                        : tripDetailUi.tagConfirm,
                    )}
                  >
                    {accommodation.bookingStatus === 'BOOKED' ? '已确认' : '待确认'}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-foreground line-clamp-1">{itemTitle(accommodation)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">入住 {formatTime(accommodation.startTime)}</p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-tight">尚未安排住宿 · 去安排</p>
            )}
          </button>
        ) : (
        <div className="rounded-md border border-border bg-card px-2 py-1.5 self-center">
          {accommodation ? (
            <>
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 text-[10px]',
                    accommodation.bookingStatus === 'BOOKED'
                      ? tripDetailUi.tagVerified
                      : tripDetailUi.tagConfirm,
                  )}
                >
                  {accommodation.bookingStatus === 'BOOKED' ? '已确认' : '待确认'}
                </Badge>
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-1">{itemTitle(accommodation)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">入住 {formatTime(accommodation.startTime)}</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-tight">尚未安排住宿</p>
          )}
        </div>
        )}
      </div>
      {dayExecutability ? (
        <DayExecutabilityPanel
          view={dayExecutability}
          onViewAlternatives={onViewAlternatives}
          className="mt-2 bg-card py-2.5 shadow-none"
        />
      ) : null}
      {planObjectDay?.objects?.length ? (
        <TimelinePlanObjectDayChain
          dayNumber={planObjectDay.dayNumber}
          objects={planObjectDay.objects}
          className="shadow-none"
        />
      ) : null}
    </div>
  );
}

function TimelineOverviewStatsRow({
  overview,
  loading,
  onOpenFilesTab,
}: {
  overview: TimelineOverviewResponse | null;
  loading: boolean;
  onOpenFilesTab?: () => void;
}) {
  if (loading && !overview) {
    return null;
  }

  const progress = overview?.planning.progressPercent ?? 0;
  const feasibility = resolveTimelineScoreLabel(overview?.stats.feasibilityScore);
  const pendingValue = overview?.stats.pendingConfirmationCount ?? 0;
  const pendingSub = overview
    ? formatTimelinePendingSubtext({
        pendingConfirmationCount: overview.stats.pendingConfirmationCount,
        conflictCount: overview.stats.conflictCount,
        filesPendingCount: overview.stats.filesPendingCount,
      })
    : '—';
  const filesPendingCount = overview?.stats.filesPendingCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <TripDetailStatCard
        label="规划进度"
        value={`${Math.round(progress)}%`}
        className="p-3 shadow-none"
        sub={
          <>
            {overview?.planning.currentStageName ? (
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {overview.planning.currentStageName}
              </p>
            ) : null}
            <div className="h-1.5 bg-border/50 rounded-full mt-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </>
        }
      />
      <TripDetailStatCard
        label="可行性"
        value={overview?.stats.feasibilityScore ?? '—'}
        className="p-3 shadow-none"
        sub={
          overview ? (
            <Badge variant="outline" className={scoreBadgeClass(feasibility.tone)}>
              {feasibility.label}
            </Badge>
          ) : null
        }
      />
      <TripDetailStatCard
        label={TRIP_DETAIL_TERMS.suggestedConfirm.short}
        value={pendingValue}
        className="p-3 shadow-none"
        sub={
          filesPendingCount > 0 && onOpenFilesTab ? (
            <button
              type="button"
              className="text-left text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              onClick={onOpenFilesTab}
            >
              {pendingSub}
            </button>
          ) : (
            pendingSub
          )
        }
      />
    </div>
  );
}

export default function TripDetailTimelineTab({
  trip,
  onAddDay,
  onOpenPlanStudio,
  timelineOverview: overview,
  timelineOverviewLoading = false,
  onOpenFilesTab,
  onOpenDecisions,
  highlightItineraryItemId = null,
}: TripDetailTimelineTabProps) {
  const { status: travelStatus } = useTripStatusBarModel(trip.id);
  const dayExecutabilityMap = useMemo(
    () => buildDayExecutabilityMap(travelStatus),
    [travelStatus],
  );
  const highlightScrolledRef = useRef<string | null>(null);
  const overviewLoading = timelineOverviewLoading;

  const alignmentProbe = useDecisionSurfaceAlignmentProbe(trip.id, {
    timelineConflictCount: overview?.stats?.conflictCount,
    timelineConflictCountSource: overview?.stats?.conflictCountSource,
  });

  const totalKm = (trip.TripDay || []).reduce(
    (acc, day) =>
      acc +
      (day.ItineraryItem || []).reduce(
        (d, item) => d + (item.travelFromPreviousDistance ?? 0),
        0,
      ),
    0,
  );
  const totalMin = (trip.TripDay || []).reduce(
    (acc, day) =>
      acc +
      (day.ItineraryItem || []).reduce(
        (d, item) => d + (item.travelFromPreviousDuration ?? 0),
        0,
      ),
    0,
  );

  const planObjectDayByNumber = useMemo(() => {
    const map = new Map<number, PlanObjectDayChainDto>();
    for (const day of overview?.planObjects?.days ?? []) {
      map.set(day.dayNumber, day);
    }
    return map;
  }, [overview?.planObjects?.days]);

  useEffect(() => {
    if (!highlightItineraryItemId) return;
    if (highlightScrolledRef.current === highlightItineraryItemId) return;
    const el = document.getElementById(`trip-item-${highlightItineraryItemId}`);
    if (!el) return;
    highlightScrolledRef.current = highlightItineraryItemId;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [highlightItineraryItemId, trip.TripDay, overviewLoading]);

  const openPlanStudio = (detail?: PlanStudioScheduleNavigateDetail, meta?: { taskId?: string; taskCategory?: string }) => {
    if (!onOpenPlanStudio) return;
    trackTripDetailPlanStudioDeeplink({
      tripId: trip.id,
      fromTab: 'timeline',
      dayNumber: detail?.dayNumber ?? (detail?.dayIndex != null ? detail.dayIndex + 1 : undefined),
      taskId: meta?.taskId,
      taskCategory: meta?.taskCategory,
    });
    onOpenPlanStudio(detail);
  };

  return (
    <div className="space-y-2.5">
      <TripDetailTabGateSummary
        variant="executability"
        tripId={trip.id}
        bannerLayout="inline"
        className="shadow-none"
      />
      <TimelineOverviewStatsRow
        overview={overview}
        loading={overviewLoading}
        onOpenFilesTab={onOpenFilesTab}
      />
      {overview?.planObjects?.topAssessment ? (
        <TimelinePlanObjectTopAssessmentCard
          assessment={overview.planObjects.topAssessment}
          className="shadow-none"
        />
      ) : null}
      <DecisionSurfaceAlignmentDevHint
        problemsOpenCount={alignmentProbe.snapshot.problemsOpenCount}
        conflictsTotal={alignmentProbe.snapshot.conflictsTotal}
        timelineConflictCount={alignmentProbe.snapshot.timelineConflictCount}
        timelineConflictCountSource={overview?.stats?.conflictCountSource}
        decisionProblems={alignmentProbe.snapshot.decisionProblems}
        planningConflicts={alignmentProbe.snapshot.planningConflicts}
      />

      <div className="space-y-1.5">
        {(trip.TripDay || []).map((day, idx) => (
          <DayTimelineRow
            key={day.id}
            day={day}
            dayIndex={idx}
            planObjectDay={planObjectDayByNumber.get(idx + 1)}
            highlightItineraryItemId={highlightItineraryItemId}
            dayExecutability={dayExecutabilityMap.get(idx + 1)}
            onViewAlternatives={onOpenDecisions}
            onOpenPlanStudioDay={
              onOpenPlanStudio ? (dayNumber) => openPlanStudio({ dayNumber }) : undefined
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {onAddDay ? (
          <Button variant="outline" size="sm" onClick={onAddDay}>
            <Plus className="w-4 h-4 mr-1" />
            添加新的一天
          </Button>
        ) : null}
        <div className="text-sm text-muted-foreground ml-auto tabular-nums">
          总里程 ~{Math.round(totalKm / 1000).toLocaleString()} km · 总时长 ~
          {Math.floor(totalMin / 60)}h {String(totalMin % 60).padStart(2, '0')}m
        </div>
      </div>
    </div>
  );
}
