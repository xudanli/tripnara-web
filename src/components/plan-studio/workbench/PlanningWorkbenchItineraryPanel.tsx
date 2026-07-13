import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { AlertTriangle, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { itineraryItemsApi } from '@/api/trips';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import type { ItineraryItemDetail, TripDetail, Collaborator } from '@/types/trip';
import { useWorldModelGuards } from '@/hooks/useWorldModelGuards';
import { resolveDestinationTimezone } from '@/utils/timezone';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import {
  dayIndexesWithOpenDecisionProblems,
  openDecisionProblemsForDayIndex,
} from '@/lib/decision-problems-by-day.util';
import { extractDecisionCheckerPoiTokens } from '@/lib/decision-checker-focus.util';
import type { DecisionCheckerSplitBannerDto } from '@/types/decision-checker';
import {
  findDaySplitForSelectedDay,
  isForkDaySplit,
  normalizePlanningDaySplits,
  resolveDaySplitIndex,
  type PlanningDaySplitDto,
} from '@/types/planning-day-split';
import {
  isLongDistanceTransportConflict,
  resolvePlanningConflictGateStatus,
  resolveTopPlanningConflictBanner,
} from '@/lib/planning-conflicts.util';
import { splitPlanAffectedDayIndexes } from '@/lib/split-plan-workbench.util';
import {
  buildWorkbenchDayTabAriaLabel,
  handleWorkbenchDayTabListKeyDown,
} from './workbench-day-tab.util';
import { trackWorkbenchDaySelect, trackWorkbenchOpenDecisionSpace } from '@/utils/plan-studio-workbench-analytics';
import type { CascadeAffectedItem, CascadeUiHint } from '@/types/readiness-cascade';
import {
  buildWorkbenchDayContextSummary,
  filterCascadeHintsForDay,
} from '@/lib/workbench-timeline-impact.util';
import { WorkbenchRouteSummaryBar } from './WorkbenchRouteSummaryBar';
import { WorkbenchDayDetailCard } from './WorkbenchDayDetailCard';
import { WorkbenchDaySplitTimeline } from './WorkbenchDaySplitTimeline';
import { WorkbenchSplitPlanBanner } from './WorkbenchSplitPlanBanner';
import { WorkbenchGateStatusBanner } from './WorkbenchGateStatusBanner';
import { useWorkbenchItineraryData, resolveWorkbenchItineraryLoadingLabel } from './useWorkbenchItineraryData';
import {
  workbenchColumnSurface,
  workbenchDayTabAffected,
  workbenchDayTabConflictBorderClass,
  workbenchDayTabConflictIconClass,
  workbenchDayTabIdle,
  workbenchDayTabSelected,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchScheduleDayStrip,
  workbenchScrollable,
  workbenchDayTabSplit,
} from './workbench-ui';

export interface PlanningWorkbenchItineraryPanelProps {
  tripId: string;
  trip: TripDetail | null;
  conflicts: UsePlanningConflictsResult;
  /** 是否展示顶栏路线摘要（默认 true） */
  showRouteSummary?: boolean;
  refreshKey?: number;
  memberCount?: number;
  topBanners?: React.ReactNode;
  splitBanner?: DecisionCheckerSplitBannerDto | null;
  daySplits?: PlanningDaySplitDto[];
  collaborators?: Collaborator[] | null;
  /** true = 待应用预览（展示并行时间线）；apply 后 false，回单线日程 */
  splitPreviewPending?: boolean;
  onOpenSplitPlan?: () => void;
  onOpenConflicts?: () => void;
  /** 打开决策空间（查看解决方案） */
  onOpenDecisionSpace?: (context?: { conflictId?: string; dayIndex?: number }) => void;
  onAdjustSegmentDistance?: () => void;
  onViewFullMap?: () => void;
  onOpenFullSchedule?: (dayIndex?: number) => void;
  /** 打开探索景点子模式 */
  onOpenAttractionExplore?: () => void;
  /** 打开编排行程子模式 */
  onOpenArrangeItinerary?: () => void;
  /** 行程项编辑成功后刷新工作台与父级数据 */
  onItineraryChanged?: () => void;
  /** Gateway 决策问题 — 用于天级 badge */
  decisionProblems?: DecisionProblemSummary[];
  /** 受控选中天（0-based）；不传则组件内部管理 */
  selectedDay?: number;
  onSelectedDayChange?: (dayIndex: number) => void;
  /** 当日冲突行 / 时间轴 POI 等，供决策检查器证据 Tab 按天聚合 */
  onScheduleDayFocusDetailChange?: (tokens: string[]) => void;
  /** 当日时间轴 POI 展示名（不含【攻略调整】等 badge 文案） */
  onScheduleDayTimelinePoisChange?: (poiNames: string[]) => void;
  /** full = 含当日详情卡；summary = 仅 Gate/路线/天条（小屏摘要列） */
  panelDepth?: 'full' | 'summary';
  onDeferDayConflicts?: (dayIndex: number) => void;
  canDeferDayConflicts?: boolean;
  isConflictDismissed?: (conflictId: string) => boolean;
  onRestoreConflict?: (conflictId: string) => void;
  cascadeHints?: CascadeUiHint[];
  cascadeAffectedItems?: CascadeAffectedItem[];
  onViewDayMap?: (dayIndex: number) => void;
  selectedTimelineEntryId?: string | null;
  onSelectedTimelineEntryChange?: (entryId: string | null) => void;
  onViewTimelineEntryImpact?: (entryId: string, dayIndex: number) => void;
  /** P1：冰岛自驾 TEP 弹性标签编辑 */
  tepFlexibilityEnabled?: boolean;
  className?: string;
}

/** 中间 · 行程与冲突分析（设计稿样式） */
export const PlanningWorkbenchItineraryPanel = memo(function PlanningWorkbenchItineraryPanel({
  tripId,
  trip,
  conflicts,
  showRouteSummary = true,
  refreshKey = 0,
  memberCount = 0,
  topBanners,
  splitBanner,
  daySplits: daySplitsProp,
  collaborators,
  splitPreviewPending = false,
  onOpenSplitPlan,
  onOpenConflicts,
  onOpenDecisionSpace,
  onAdjustSegmentDistance,
  onViewFullMap,
  onOpenFullSchedule,
  onOpenAttractionExplore,
  onOpenArrangeItinerary,
  onItineraryChanged,
  decisionProblems,
  selectedDay: selectedDayProp,
  onSelectedDayChange,
  onScheduleDayFocusDetailChange,
  onScheduleDayTimelinePoisChange,
  panelDepth = 'full',
  onDeferDayConflicts,
  canDeferDayConflicts = false,
  isConflictDismissed,
  onRestoreConflict,
  cascadeHints = [],
  cascadeAffectedItems = [],
  onViewDayMap,
  selectedTimelineEntryId,
  onSelectedTimelineEntryChange,
  onViewTimelineEntryImpact,
  tepFlexibilityEnabled = false,
  className,
}: PlanningWorkbenchItineraryPanelProps) {
  const dayCount = trip?.TripDay?.length ?? 0;
  const [internalSelectedDay, setInternalSelectedDay] = useState(0);
  const [editingItem, setEditingItem] = useState<ItineraryItemDetail | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { canEditTiming, worldModelGuards } = useWorldModelGuards();
  const scheduleTimezone = useMemo(
    () => resolveDestinationTimezone(trip?.destination),
    [trip?.destination],
  );
  const selectedDay = selectedDayProp ?? internalSelectedDay;
  const setSelectedDay = useCallback(
    (dayIndex: number) => {
      onSelectedDayChange?.(dayIndex);
      if (selectedDayProp == null) {
        setInternalSelectedDay(dayIndex);
      }
    },
    [onSelectedDayChange, selectedDayProp],
  );

  const { loading, loadingPhase, routeStops, routeStats, buildDaySnapshot, reload } =
    useWorkbenchItineraryData(
    tripId,
    trip,
    conflicts.items,
    refreshKey,
  );

  const daySplits = useMemo(
    () => normalizePlanningDaySplits(daySplitsProp),
    [daySplitsProp],
  );

  const handleEditTimelineEntry = useCallback(
    async (itemId: string) => {
      if (!canEditTiming) {
        toast.error(worldModelGuards?.banner_message_zh ?? '当前阶段不可编辑行程时间');
        return;
      }
      try {
        const item = await itineraryItemsApi.getById(itemId);
        setEditingItem(item);
        setEditDialogOpen(true);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : '加载行程项失败');
      }
    },
    [canEditTiming, worldModelGuards],
  );

  const handleEditDialogSuccess = useCallback(async () => {
    await reload();
    onItineraryChanged?.();
  }, [reload, onItineraryChanged]);

  const daySnapshot = useMemo(
    () => buildDaySnapshot(selectedDay),
    [buildDaySnapshot, selectedDay],
  );

  const dayCascadeHints = useMemo(() => {
    const titles = daySnapshot?.timeline.map((entry) => entry.title) ?? [];
    return filterCascadeHintsForDay(cascadeHints, titles);
  }, [cascadeHints, daySnapshot?.timeline]);

  useEffect(() => {
    if (!onScheduleDayFocusDetailChange && !onScheduleDayTimelinePoisChange) return;
    const snap = daySnapshot;
    if (!snap) {
      onScheduleDayFocusDetailChange?.([]);
      onScheduleDayTimelinePoisChange?.([]);
      return;
    }
    const tokens = new Set<string>();
    const addTokens = (raw?: string | null) => {
      for (const token of extractDecisionCheckerPoiTokens(raw)) {
        tokens.add(token);
      }
    };
    for (const line of snap.conflictLines) {
      addTokens(line.label);
      addTokens(line.detail);
    }
    for (const entry of snap.timeline) {
      addTokens(entry.title);
      addTokens(entry.subtitle);
    }
    onScheduleDayFocusDetailChange?.([...tokens]);
    onScheduleDayTimelinePoisChange?.(
      snap.timeline.map((entry) => entry.title.trim()).filter(Boolean),
    );
  }, [daySnapshot, onScheduleDayFocusDetailChange, onScheduleDayTimelinePoisChange]);

  const activeDaySplit = useMemo(
    () => findDaySplitForSelectedDay(daySplits, selectedDay),
    [daySplits, selectedDay],
  );

  const showForkTimeline = isForkDaySplit(activeDaySplit);

  const affectedDayIndexes = useMemo(
    () => splitPlanAffectedDayIndexes(splitBanner?.affectedDays),
    [splitBanner?.affectedDays],
  );

  const affectedDayIndexesKey = splitBanner?.affectedDays?.join(',') ?? '';
  const didAutoSelectSplitDayRef = useRef(false);

  useEffect(() => {
    if (!splitPreviewPending) {
      didAutoSelectSplitDayRef.current = false;
      return;
    }
    if (affectedDayIndexes.size === 0) return;
    if (didAutoSelectSplitDayRef.current) return;
    didAutoSelectSplitDayRef.current = true;
    const firstAffected = Math.min(...affectedDayIndexes);
    setSelectedDay(firstAffected);
  }, [splitPreviewPending, affectedDayIndexesKey, affectedDayIndexes]);

  const daysWithSplit = useMemo(() => {
    const set = new Set<number>();
    for (const split of daySplits) {
      if (isForkDaySplit(split)) {
        set.add(resolveDaySplitIndex(split));
      }
    }
    return set;
  }, [daySplits]);

  const topBannerConflict = useMemo(
    () => resolveTopPlanningConflictBanner(conflicts.items),
    [conflicts.items],
  );

  const topBannerGateStatus = useMemo(
    () => (topBannerConflict ? resolvePlanningConflictGateStatus(topBannerConflict) : null),
    [topBannerConflict],
  );

  const showSegmentDistanceCta = useMemo(
    () =>
      Boolean(
        topBannerConflict &&
          topBannerConflict.priority === 'must_handle' &&
          isLongDistanceTransportConflict(topBannerConflict) &&
          onAdjustSegmentDistance,
      ),
    [topBannerConflict, onAdjustSegmentDistance],
  );

  const daysWithDecisionProblems = useMemo(
    () => dayIndexesWithOpenDecisionProblems(decisionProblems),
    [decisionProblems],
  );

  const dayDecisionProblems = useMemo(
    () => openDecisionProblemsForDayIndex(decisionProblems, selectedDay),
    [decisionProblems, selectedDay],
  );

  const dayContextSummary = useMemo(() => {
    if (!daySnapshot) return undefined;
    return buildWorkbenchDayContextSummary({
      executable: daySnapshot.executable,
      conflictLines: daySnapshot.conflictLines,
      decisionProblems: dayDecisionProblems,
      cascadeHints: dayCascadeHints,
    });
  }, [daySnapshot, dayDecisionProblems, dayCascadeHints]);

  const dayConflictTone = useMemo(() => {
    const toneByDay = new Map<number, 'hard' | 'soft'>();

    const bump = (dayIndex: number, hard: boolean) => {
      if (dayIndex < 0) return;
      const current = toneByDay.get(dayIndex);
      if (hard) {
        toneByDay.set(dayIndex, 'hard');
      } else if (current !== 'hard') {
        toneByDay.set(dayIndex, 'soft');
      }
    };

    for (const item of conflicts.items) {
      const days = item.affectedDays ?? item.issue?.affectedDays;
      const isHard = item.priority === 'must_handle';
      if (days?.length) {
        days.forEach((d) => bump(d - 1, isHard));
      }
    }

    if (!loading && dayCount > 0) {
      for (let i = 0; i < dayCount; i++) {
        const snap = buildDaySnapshot(i);
        if (!snap) continue;
        for (const line of snap.conflictLines) {
          bump(i, line.severity === 'hard');
        }
      }
    }

    return toneByDay;
  }, [conflicts.items, loading, dayCount, buildDaySnapshot]);

  const daysWithConflict = useMemo(() => new Set(dayConflictTone.keys()), [dayConflictTone]);

  useEffect(() => {
    const onSelectDay = (event: Event) => {
      const detail = (event as CustomEvent<{ dayIndex?: number }>).detail;
      if (typeof detail?.dayIndex === 'number' && detail.dayIndex >= 0) {
        setSelectedDay(detail.dayIndex);
      }
    };
    window.addEventListener('plan-studio:select-schedule-day', onSelectDay);
    return () => window.removeEventListener('plan-studio:select-schedule-day', onSelectDay);
  }, [setSelectedDay]);

  const handleDaySelect = useCallback((dayIndex: number) => {
    setSelectedDay(dayIndex);
    trackWorkbenchDaySelect({
      tripId,
      dayIndex,
      hasConflict: daysWithConflict.has(dayIndex),
      hasDecisionProblem: daysWithDecisionProblems.has(dayIndex),
    });
  }, [setSelectedDay, tripId, daysWithConflict, daysWithDecisionProblems]);

  const handleDeferConflict = useCallback(() => {
    onDeferDayConflicts?.(selectedDay);
  }, [onDeferDayConflicts, selectedDay]);

  const handleViewSolutions = useCallback(() => {
    const conflictId = topBannerConflict?.id;
    trackWorkbenchOpenDecisionSpace({
      tripId,
      source: 'day_card',
      dayIndex: selectedDay,
      conflictId,
    });
    if (onOpenDecisionSpace) {
      onOpenDecisionSpace({ conflictId, dayIndex: selectedDay });
      return;
    }
    onOpenConflicts?.();
  }, [topBannerConflict?.id, onOpenDecisionSpace, onOpenConflicts, selectedDay, tripId]);

  const itineraryLoadingLabel = useMemo(
    () => resolveWorkbenchItineraryLoadingLabel(loadingPhase, conflicts.loading),
    [loadingPhase, conflicts.loading],
  );

  const dayTabStrip =
    dayCount > 0 ? (
      <div className={cn('relative z-10 mb-1.5', workbenchScheduleDayStrip)}>
        <div
          role="tablist"
          aria-label="行程天数"
          className="flex gap-1 overflow-x-auto pb-0.5"
          onKeyDown={(event) =>
            handleWorkbenchDayTabListKeyDown(event, dayCount, selectedDay, handleDaySelect)
          }
        >
          {Array.from({ length: dayCount }, (_, idx) => {
            const isAffected = affectedDayIndexes.has(idx);
            const hasSplit = daysWithSplit.has(idx);
            const hasConflict = daysWithConflict.has(idx);
            const conflictTone = dayConflictTone.get(idx);
            const hasDecision = daysWithDecisionProblems.has(idx);
            const isSelected = selectedDay === idx;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                id={`workbench-day-tab-${idx}`}
                aria-selected={isSelected}
                aria-controls={panelDepth === 'full' ? `workbench-day-panel-${idx}` : undefined}
                tabIndex={isSelected ? 0 : -1}
                aria-label={buildWorkbenchDayTabAriaLabel(idx + 1, {
                  hasConflict,
                  hasDecision,
                  hasSplit,
                  isSelected,
                })}
                onClick={() => handleDaySelect(idx)}
                className={cn(
                  'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isSelected ? workbenchDayTabSelected : workbenchDayTabIdle,
                  !isSelected && hasSplit && workbenchDayTabSplit,
                  !isSelected && isAffected && !hasSplit && workbenchDayTabAffected,
                  !isSelected &&
                    conflictTone &&
                    !isAffected &&
                    !hasSplit &&
                    workbenchDayTabConflictBorderClass(conflictTone),
                  !isSelected && hasDecision && !hasConflict && workbenchDayTabAffected,
                )}
              >
                第 {idx + 1} 天
                {hasDecision ? (
                  <span
                    className={cn(
                      'ml-1 inline text-[10px] font-medium',
                      isSelected ? 'text-primary-foreground/85' : 'text-muted-foreground',
                    )}
                  >
                    决策
                  </span>
                ) : null}
                {conflictTone ? (
                  <AlertTriangle
                    className={cn(
                      'ml-1 inline h-3 w-3',
                      workbenchDayTabConflictIconClass(conflictTone, isSelected),
                    )}
                    aria-hidden
                  />
                ) : null}
                {hasSplit ? (
                  <span className="ml-1 inline text-[10px] font-medium text-muted-foreground">
                    分流
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  const itineraryChrome = (
    <>
      {topBanners && panelDepth === 'full' ? <div className="mb-1.5 space-y-1.5">{topBanners}</div> : null}

      {splitBanner ? (
        <WorkbenchSplitPlanBanner
          banner={splitBanner}
          onViewSplitPlan={onOpenSplitPlan}
          className="mb-1.5"
        />
      ) : null}

      {topBannerConflict && topBannerGateStatus && panelDepth !== 'full' ? (
        <div className="mb-1.5 space-y-1">
          <WorkbenchGateStatusBanner
            status={topBannerGateStatus}
            message={
              [topBannerConflict.title, topBannerConflict.message].filter(Boolean).join(' — ') ||
              undefined
            }
            size="sm"
          />
          {panelDepth === 'full' && showSegmentDistanceCta ? (
            <Button
              variant="outline"
              size="sm"
              className="h-6 border-border/60 bg-background/80 px-2 text-[10px]"
              onClick={onAdjustSegmentDistance}
            >
              调整单段最长距离
            </Button>
          ) : null}
        </div>
      ) : null}

      {showRouteSummary ? (
        <WorkbenchRouteSummaryBar
          routeStops={routeStops}
          stats={routeStats}
          onViewFullMap={onViewFullMap}
          className="mb-1.5"
        />
      ) : null}

      {dayTabStrip}
    </>
  );

  const dayDetailPanel =
    loading && !daySnapshot ? (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 py-20"
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-7 w-7" />
        <p className="text-xs text-muted-foreground">{itineraryLoadingLabel}</p>
      </div>
    ) : daySnapshot ? (
      <div
        role="tabpanel"
        id={`workbench-day-panel-${selectedDay}`}
        aria-labelledby={`workbench-day-tab-${selectedDay}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {showForkTimeline && activeDaySplit ? (
          <WorkbenchDaySplitTimeline
            split={activeDaySplit}
            collaborators={collaborators ?? undefined}
            className="min-h-0 flex-1"
          />
        ) : (
          <WorkbenchDayDetailCard
            day={daySnapshot}
            dayContext={dayContextSummary}
            solutionCount={conflicts.summary.mustHandle || conflicts.summary.suggestAdjust}
            memberCount={memberCount}
            decisionProblems={dayDecisionProblems}
            onViewSolutions={handleViewSolutions}
            onDeferConflict={handleDeferConflict}
            canDeferConflict={canDeferDayConflicts}
            isConflictDismissed={isConflictDismissed}
            onRestoreConflict={onRestoreConflict}
            onViewDayMap={onViewDayMap ? () => onViewDayMap(selectedDay) : undefined}
            onEditEntry={handleEditTimelineEntry}
            selectedEntryId={selectedTimelineEntryId}
            onSelectEntry={onSelectedTimelineEntryChange}
            className="min-h-0 flex-1"
          />
        )}
      </div>
    ) : (
      <p className="py-12 text-center text-sm text-muted-foreground">暂无行程数据</p>
    );

  return (
    <>
    <div className={cn('flex h-full min-h-0 flex-col', workbenchColumnSurface, className)}>
      {panelDepth === 'full' ? (
        <div className={workbenchPanelHeader}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={workbenchPanelTitle}>行程诊断</h2>
            <div className="flex shrink-0 items-center gap-1.5">
              {onOpenFullSchedule ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 rounded-md px-2 text-[10px]"
                  onClick={() => onOpenFullSchedule()}
                >
                  <CalendarRange className="h-3 w-3" />
                  编辑完整时间轴
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {panelDepth === 'full' ? (
        <>
          <div className={cn('shrink-0 p-2 pb-0 sm:p-3 sm:pb-0', workbenchScrollable)}>
            {itineraryChrome}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-2 pt-1.5 sm:p-3 sm:pt-1.5">{dayDetailPanel}</div>
        </>
      ) : (
        <div className={cn('min-h-0 flex-1 overflow-y-auto p-3 sm:p-4', workbenchScrollable)}>
          {itineraryChrome}
        </div>
      )}
    </div>

    {editingItem && editDialogOpen ? (
      <EditItineraryItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSuccess={handleEditDialogSuccess}
        timezone={scheduleTimezone}
        tripDays={trip?.TripDay?.map((d) => ({ id: d.id, date: d.date })) ?? []}
        currentTripDayId={editingItem.tripDayId ?? editingItem.TripDay?.id}
        tepFlexibilityEnabled={tepFlexibilityEnabled}
      />
    ) : null}
    </>
  );
});
