import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { PersonaAlert, TripDetail, Collaborator } from '@/types/trip';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { DecisionCheckerSplitBannerDto } from '@/types/decision-checker';
import {
  findDaySplitForSelectedDay,
  isForkDaySplit,
  normalizePlanningDaySplits,
  resolveDaySplitIndex,
  type PlanningDaySplitDto,
} from '@/types/planning-day-split';
import { isLongDistanceTransportConflict } from '@/lib/planning-conflicts.util';
import { splitPlanAffectedDayIndexes } from '@/lib/split-plan-workbench.util';
import { WorkbenchRouteSummaryBar } from './WorkbenchRouteSummaryBar';
import { WorkbenchDayDetailCard } from './WorkbenchDayDetailCard';
import { WorkbenchDaySplitTimeline } from './WorkbenchDaySplitTimeline';
import { WorkbenchSplitPlanBanner } from './WorkbenchSplitPlanBanner';
import { WorkbenchPersonaCommitteePanel } from './WorkbenchPersonaCommitteePanel';
import { useWorkbenchItineraryData } from './useWorkbenchItineraryData';
import {
  workbenchColumnSurface,
  workbenchDayTabAffected,
  workbenchDayTabConflict,
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
  personaAlerts?: PersonaAlert[];
  showRouteMap?: boolean;
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
  onViewEvaluationReport?: () => void;
  onOpenFullSchedule?: () => void;
  className?: string;
}

/** 中间 · 行程与冲突分析（设计稿样式） */
export function PlanningWorkbenchItineraryPanel({
  tripId,
  trip,
  conflicts,
  personaAlerts,
  showRouteMap = true,
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
  onViewEvaluationReport,
  onOpenFullSchedule,
  className,
}: PlanningWorkbenchItineraryPanelProps) {
  const dayCount = trip?.TripDay?.length ?? 0;
  const [selectedDay, setSelectedDay] = useState(0);

  const { loading, coverageMap, routeStats, buildDaySnapshot } =
    useWorkbenchItineraryData(
    tripId,
    trip,
    conflicts.items,
    refreshKey,
    { showRouteMap },
  );

  const daySplits = useMemo(
    () => normalizePlanningDaySplits(daySplitsProp),
    [daySplitsProp],
  );

  const daySnapshot = useMemo(
    () => buildDaySnapshot(selectedDay),
    [buildDaySnapshot, selectedDay],
  );

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

  const hardConflict = useMemo(() => {
    const mustHandle = conflicts.items.find((i) => i.priority === 'must_handle');
    if (mustHandle) return mustHandle;
    if (conflicts.summary.mustHandle > 0) return conflicts.items[0];
    return null;
  }, [conflicts.items, conflicts.summary.mustHandle]);

  const showSegmentDistanceCta = useMemo(
    () => Boolean(hardConflict && isLongDistanceTransportConflict(hardConflict) && onAdjustSegmentDistance),
    [hardConflict, onAdjustSegmentDistance],
  );

  const daysWithConflict = useMemo(() => {
    const set = new Set<number>();
    for (const item of conflicts.items) {
      const days = item.affectedDays ?? item.issue?.affectedDays;
      if (days?.length) {
        days.forEach((d) => set.add(d - 1));
      }
    }
    if (!loading && dayCount > 0) {
      for (let i = 0; i < dayCount; i++) {
        const snap = buildDaySnapshot(i);
        if (snap && snap.conflictLines.length > 0) {
          set.add(i);
        }
      }
    }
    return set;
  }, [conflicts.items, loading, dayCount, buildDaySnapshot]);

  useEffect(() => {
    const onSelectDay = (event: Event) => {
      const detail = (event as CustomEvent<{ dayIndex?: number }>).detail;
      if (typeof detail?.dayIndex === 'number' && detail.dayIndex >= 0) {
        setSelectedDay(detail.dayIndex);
      }
    };
    window.addEventListener('plan-studio:select-schedule-day', onSelectDay);
    return () => window.removeEventListener('plan-studio:select-schedule-day', onSelectDay);
  }, []);

  const handleDaySelect = useCallback((dayIndex: number) => {
    setSelectedDay(dayIndex);
  }, []);

  const handleIgnoreConflict = useCallback(() => {
    toast.message('已记录忽略偏好', {
      description: '可在决策检查器中继续查看其他修复方案。',
    });
  }, []);

  const handleViewSolutions = useCallback(() => {
    const conflictId = hardConflict?.id;
    if (onOpenDecisionSpace) {
      onOpenDecisionSpace({ conflictId, dayIndex: selectedDay });
      return;
    }
    onOpenConflicts?.();
  }, [hardConflict?.id, onOpenDecisionSpace, onOpenConflicts, selectedDay]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchColumnSurface, className)}>
      <div className={workbenchPanelHeader}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={workbenchPanelTitle}>行程与冲突分析</h2>
        {onOpenFullSchedule ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
            onClick={onOpenFullSchedule}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            编辑完整时间轴
          </Button>
        ) : null}
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3 sm:p-4', workbenchScrollable)}>
        {topBanners ? <div className="mb-3 space-y-2">{topBanners}</div> : null}

        {splitBanner ? (
          <WorkbenchSplitPlanBanner
            banner={splitBanner}
            onViewSplitPlan={onOpenSplitPlan}
            className="mb-3"
          />
        ) : null}

        {hardConflict ? (
          <Alert className="mb-3 rounded-xl border-gate-reject-border/70 bg-gate-reject/12">
            <AlertTriangle className="h-4 w-4 text-gate-reject-foreground" />
            <AlertTitle className="text-sm font-semibold text-foreground">硬冲突</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground/90">{hardConflict.title}</span>
              {hardConflict.message ? ` — ${hardConflict.message}` : ''}
            </AlertDescription>
            {showSegmentDistanceCta ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 border-gate-reject-border/60 bg-background/80 text-[11px]"
                onClick={onAdjustSegmentDistance}
              >
                调整单段最长距离
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <WorkbenchRouteSummaryBar
          coverageMap={coverageMap}
          stats={routeStats}
          loading={loading}
          onViewFullMap={onViewFullMap}
          className="mb-3"
        />

        {dayCount > 0 ? (
          <div className={cn('relative z-10 mb-3', workbenchScheduleDayStrip)}>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
            {Array.from({ length: dayCount }, (_, idx) => {
              const isAffected = affectedDayIndexes.has(idx);
              const hasSplit = daysWithSplit.has(idx);
              const hasConflict = daysWithConflict.has(idx);
              const isSelected = selectedDay === idx;
              return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDaySelect(idx)}
                className={cn(
                  'shrink-0 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  isSelected ? workbenchDayTabSelected : workbenchDayTabIdle,
                  !isSelected && hasSplit && workbenchDayTabSplit,
                  !isSelected && isAffected && !hasSplit && workbenchDayTabAffected,
                  !isSelected && hasConflict && !isAffected && !hasSplit && workbenchDayTabConflict,
                )}
              >
                第 {idx + 1} 天
                {hasConflict ? (
                  <AlertTriangle className="ml-1 inline h-3 w-3 text-gate-reject-foreground/90" />
                ) : null}
                {hasSplit ? (
                  <span className="ml-1 inline text-[10px] font-medium text-gate-suggest-foreground">分流</span>
                ) : null}
              </button>
            );
            })}
            </div>
          </div>
        ) : null}

        {loading && !daySnapshot ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-7 w-7" />
          </div>
        ) : daySnapshot ? (
          <div
            className={cn(
              'grid min-h-[420px] gap-3',
              showForkTimeline
                ? 'grid-cols-1'
                : 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,30%)]',
            )}
          >
            {showForkTimeline && activeDaySplit ? (
              <WorkbenchDaySplitTimeline
                split={activeDaySplit}
                collaborators={collaborators ?? undefined}
                className="min-h-[420px]"
              />
            ) : (
              <WorkbenchDayDetailCard
                day={daySnapshot}
                solutionCount={conflicts.summary.mustHandle || conflicts.summary.suggestAdjust}
                memberCount={memberCount}
                onViewSolutions={handleViewSolutions}
                onIgnoreConflict={handleIgnoreConflict}
              />
            )}
            {!showForkTimeline ? (
              <WorkbenchPersonaCommitteePanel
                personaAlerts={personaAlerts}
                onViewFullReport={onViewEvaluationReport ?? onOpenConflicts}
                className="min-h-[420px]"
              />
            ) : null}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无行程数据</p>
        )}
      </div>
    </div>
  );
}
