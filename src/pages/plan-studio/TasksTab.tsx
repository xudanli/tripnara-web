import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ReadinessTasksTab from '@/components/readiness/ReadinessTasksTab';
import PackingListTab from '@/components/readiness/PackingListTab';
import PreDepartureOverviewSidebar from '@/components/readiness/pre-departure/PreDepartureOverviewSidebar';
import PreDepartureSummaryCards from '@/components/readiness/pre-departure/PreDepartureSummaryCards';
import PreDepartureBlockersPanel from '@/components/readiness/pre-departure/PreDepartureBlockersPanel';
import PreDepartureThreeColumnBoard, {
  type PreDepartureDetailPanel,
} from '@/components/readiness/pre-departure/PreDepartureThreeColumnBoard';
import BookingConfirmationTab from '@/components/readiness/pre-departure/BookingConfirmationTab';
import { tripsApi } from '@/api/trips';
import { readinessApi, type ScoreBreakdownResponse } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import { useAuth } from '@/hooks/useAuth';
import { useReadinessPreparationTasks } from '@/hooks/useReadinessPreparationTasks';
import { countTaskProgress } from '@/lib/readiness-preparation-tasks';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { cn } from '@/lib/utils';
import {
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchScrollable,
  workbenchShell,
} from '@/components/plan-studio/workbench/workbench-ui';

export type PreDepartureSubTab = 'tasks' | 'packing' | 'bookings';

const DETAIL_PANEL_TITLE: Record<PreDepartureDetailPanel, string> = {
  tasks: '准备任务',
  packing: '打包清单',
  bookings: '预订确认',
};

interface TasksTabProps {
  tripId: string;
  /** 深链打开详情抽屉：``tasks`` | ``packing`` | ``bookings`` */
  initialSubTab?: PreDepartureSubTab;
  planningConflicts?: PlanningConflictItem[];
  conflictsLoading?: boolean;
  onOpenFeasibility?: (issueId?: string | null) => void;
  onGoToSchedule?: (itemId?: string) => void;
}

export default function TasksTab({
  tripId,
  initialSubTab = 'tasks',
  planningConflicts = [],
  conflictsLoading = false,
  onOpenFeasibility,
  onGoToSchedule,
}: TasksTabProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownResponse | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [detailPanel, setDetailPanel] = useState<PreDepartureDetailPanel | null>(null);
  const [packingRefreshKey, setPackingRefreshKey] = useState(0);

  const viewer = useMemo(
    () => (user ? { id: user.id, name: user.displayName } : null),
    [user?.id, user?.displayName],
  );

  const {
    loading: loadingTasks,
    preparationTasks,
    taskMembers,
    handleToggleTask,
    handleAssignTask,
    handleChangeTaskScope,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useReadinessPreparationTasks(tripId, {
    enabled: !!tripId,
    viewer,
    isZh,
  });

  const taskProgress = useMemo(() => countTaskProgress(preparationTasks), [preparationTasks]);

  useEffect(() => {
    if (initialSubTab && initialSubTab !== 'tasks') {
      setDetailPanel(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    let cancelled = false;
    const loadTrip = async () => {
      if (!tripId) return;
      try {
        setLoadingTrip(true);
        const data = await tripsApi.getById(tripId);
        if (!cancelled) setTrip(data);
      } catch (err) {
        console.error('[TasksTab] failed to load trip:', err);
        if (!cancelled) setTrip(null);
      } finally {
        if (!cancelled) setLoadingTrip(false);
      }
    };
    void loadTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    const loadScore = async () => {
      if (!tripId) return;
      try {
        setLoadingScore(true);
        const data = await readinessApi.getScoreBreakdown(tripId);
        if (!cancelled) setScoreBreakdown(data);
      } catch (err) {
        console.error('[TasksTab] failed to load score breakdown:', err);
        if (!cancelled) setScoreBreakdown(null);
      } finally {
        if (!cancelled) setLoadingScore(false);
      }
    };
    void loadScore();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const handleConflict = useCallback(
    (conflictId: string) => {
      onOpenFeasibility?.(conflictId);
    },
    [onOpenFeasibility],
  );

  const readinessScore = scoreBreakdown?.score?.overall ?? null;
  const blockerCount = scoreBreakdown?.summary?.blockers ?? 0;
  const mustHandleCount = scoreBreakdown?.summary?.must ?? scoreBreakdown?.summary?.warnings ?? 0;
  const suggestedCount =
    scoreBreakdown?.summary?.should ?? scoreBreakdown?.summary?.suggestions ?? 0;

  if (loadingTrip || loadingTasks || loadingScore) {
    return (
      <div className={cn('flex items-center justify-center py-16', workbenchShell)}>
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex flex-col gap-6 lg:flex-row lg:items-start', workbenchShell)}>
        <PreDepartureOverviewSidebar
          tripId={tripId}
          trip={trip}
          scoreBreakdown={scoreBreakdown}
          loading={loadingScore}
          className="lg:w-64 xl:w-72"
        />

        <div className="min-w-0 flex-1 space-y-4">
          <PreDepartureSummaryCards
            readinessScore={readinessScore != null ? Math.round(readinessScore) : null}
            mustHandleCount={mustHandleCount}
            blockerCount={blockerCount}
            suggestedCount={suggestedCount}
            completedTasks={taskProgress.done}
            totalTasks={taskProgress.total}
          />

          <PreDepartureThreeColumnBoard
            tripId={tripId}
            trip={trip}
            tasks={preparationTasks}
            members={taskMembers}
            planningConflicts={planningConflicts}
            packingRefreshKey={packingRefreshKey}
            onOpenDetail={setDetailPanel}
            onGoToSchedule={onGoToSchedule}
          />

          <PreDepartureBlockersPanel
            items={planningConflicts}
            loading={conflictsLoading}
            onHandleConflict={onOpenFeasibility ? handleConflict : undefined}
            onOpenFeasibility={onOpenFeasibility ? () => onOpenFeasibility() : undefined}
          />
        </div>
      </div>

      <Sheet
        open={detailPanel != null}
        onOpenChange={(open) => {
          if (!open) {
            if (detailPanel === 'packing') {
              setPackingRefreshKey((k) => k + 1);
            }
            setDetailPanel(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-2xl', workbenchScrollable)}
        >
          {detailPanel ? (
            <>
              <SheetHeader className={cn(workbenchPanelHeader, 'px-5 py-4 text-left')}>
                <SheetTitle className={workbenchPanelTitle}>
                  {DETAIL_PANEL_TITLE[detailPanel]}
                </SheetTitle>
              </SheetHeader>
              <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2', workbenchScrollable)}>
                {detailPanel === 'tasks' ? (
                  <ReadinessTasksTab
                    tasks={preparationTasks}
                    members={taskMembers}
                    onToggleComplete={handleToggleTask}
                    onAssign={handleAssignTask}
                    onChangeScope={handleChangeTaskScope}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                ) : null}
                {detailPanel === 'packing' ? (
                  <PackingListTab tripId={tripId} trip={trip} />
                ) : null}
                {detailPanel === 'bookings' ? (
                  <BookingConfirmationTab trip={trip} onGoToSchedule={onGoToSchedule} />
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
