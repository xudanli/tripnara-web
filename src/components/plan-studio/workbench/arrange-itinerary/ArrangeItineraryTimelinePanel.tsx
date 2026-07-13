import { BedDouble, MoreHorizontal, Plus, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { WorkbenchDayDetailCard } from '../WorkbenchDayDetailCard';
import type { WorkbenchDaySnapshot } from '../useWorkbenchItineraryData';
import type { ArrangeLodgingNightStatus } from '@/lib/arrange-itinerary-lodging-coverage.util';
import { buildWorkbenchDayContextSummary } from '@/lib/workbench-timeline-impact.util';
import { ArrangeItineraryDayLodgingAnchor } from './ArrangeItineraryDayLodgingAnchor';
import { WorkbenchTimelineEntryBody } from '../WorkbenchTimelineEntryBody';
import {
  workbenchDayTabIdle,
  workbenchDayTabSelected,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';
import type { ArrangeItineraryViewMode } from './types';

export interface ArrangeItineraryTimelinePanelProps {
  viewMode: ArrangeItineraryViewMode;
  daySnapshots: WorkbenchDaySnapshot[];
  selectedDayIndex: number;
  onSelectedDayChange: (dayIndex: number) => void;
  loading?: boolean;
  destinationLabel?: string;
  weatherLabel?: string;
  onViewDayMap?: (dayIndex: number) => void;
  onEditEntry?: (entryId: string) => void;
  onDeleteEntry?: (entryId: string) => void;
  onAddActivity?: (dayIndex: number) => void;
  onAddLodging?: (dayIndex: number) => void;
  onEditLodging?: (itemId: string) => void;
  onAskAssistantForLodging?: (dayIndex: number) => void;
  lodgingNightByDayIndex?: Map<number, ArrangeLodgingNightStatus>;
  onInsertGap?: (dayIndex: number) => void;
  onAnalyzeMoveEntry?: (entryId: string, dayIndex: number) => void;
  itemLocks?: import('@/types/arrange-itinerary').ArrangeItemLocksResponse | null;
  userLockedItemIds?: Set<string>;
  onToggleUserLock?: (entryId: string, locked: boolean) => void;
  copilotEnabled?: boolean;
  selectedEntryId?: string | null;
  onSelectEntry?: (entryId: string) => void;
  className?: string;
}

export function ArrangeItineraryTimelinePanel({
  viewMode,
  daySnapshots,
  selectedDayIndex,
  onSelectedDayChange,
  loading = false,
  destinationLabel,
  weatherLabel,
  onViewDayMap,
  onEditEntry,
  onDeleteEntry,
  onAddActivity,
  onAddLodging,
  onEditLodging,
  onAskAssistantForLodging,
  lodgingNightByDayIndex,
  onInsertGap,
  onAnalyzeMoveEntry,
  itemLocks,
  userLockedItemIds,
  onToggleUserLock,
  copilotEnabled = true,
  selectedEntryId = null,
  onSelectEntry,
  className,
}: ArrangeItineraryTimelinePanelProps) {
  const selectedDay = daySnapshots[selectedDayIndex] ?? null;

  const handleMoreOperations = () => {
    toast.message('更多操作待后端编排动作接口就绪');
  };

  if (loading) {
    return (
      <div className={cn('flex h-full min-h-0 items-center justify-center', className)}>
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (daySnapshots.length === 0) {
    return (
      <div className={cn('flex h-full min-h-0 items-center justify-center p-6 text-center', className)}>
        <p className="text-xs text-muted-foreground">暂无日程数据，请先完成行程骨架或自动编排</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
          <h2 className={workbenchPanelTitle}>行程列表</h2>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', workbenchScrollable)}>
          <ul className="space-y-3">
            {daySnapshots.map((day) => {
              const lodgingNight = lodgingNightByDayIndex?.get(day.dayIndex) ?? null;
              return (
              <li key={day.dayIndex} className="rounded-xl border border-border/55 bg-card p-3">
                <p className="text-xs font-semibold text-foreground">
                  第 {day.dayNumber} 天 · {day.dateLabel} {day.weekdayLabel}
                </p>
                <ul className="mt-2 space-y-1">
                  {day.timeline.map((entry) => (
                    <li key={entry.id} className="text-[11px]">
                      <div className="flex gap-2">
                        <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
                          {entry.timeLabel}
                        </span>
                        <div className="min-w-0 flex-1">
                          <WorkbenchTimelineEntryBody entry={entry} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <ArrangeItineraryDayLodgingAnchor
                    night={lodgingNight}
                    lodgingListedInTimeline={day.timeline.some((entry) => entry.isLodging)}
                    onAddLodging={onAddLodging ? () => onAddLodging(day.dayIndex) : undefined}
                    onEditLodging={onEditLodging}
                    onAskAssistant={
                      onAskAssistantForLodging
                        ? () => onAskAssistantForLodging(day.dayIndex)
                        : undefined
                    }
                  />
                </div>
                <DayActions
                  dayIndex={day.dayIndex}
                  onAddActivity={onAddActivity}
                  onAddLodging={onAddLodging}
                  onInsertGap={onInsertGap}
                  onMoreOperations={handleMoreOperations}
                />
              </li>
            );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const showSingleDay = viewMode === 'by_day';

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={workbenchPanelTitle}>
            {showSingleDay ? '按天查看' : '行程时间轴'}
          </h2>
          {destinationLabel || weatherLabel ? (
            <p className="text-[10px] text-muted-foreground">
              {[destinationLabel, weatherLabel].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      {showSingleDay ? (
        <div className={cn('shrink-0 overflow-x-auto rounded-xl border border-border/60 bg-background px-2 py-1.5', workbenchScrollable)}>
          <div className="flex min-w-max gap-1">
            {daySnapshots.map((day) => (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => onSelectedDayChange(day.dayIndex)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] transition-colors',
                  selectedDayIndex === day.dayIndex
                    ? workbenchDayTabSelected
                    : workbenchDayTabIdle,
                )}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', workbenchScrollable)}>
        <div className="space-y-3">
          {(showSingleDay && selectedDay ? [selectedDay] : daySnapshots).map((day) => {
            const lodgingNight = lodgingNightByDayIndex?.get(day.dayIndex) ?? null;
            return (
            <div key={day.dayIndex} className="space-y-2">
              <WorkbenchDayDetailCard
                day={day}
                dayContext={buildWorkbenchDayContextSummary({
                  executable: day.executable,
                  conflictLines: day.conflictLines,
                  decisionProblems: [],
                  cascadeHints: [],
                }) ?? undefined}
                onViewDayMap={onViewDayMap ? () => onViewDayMap(day.dayIndex) : undefined}
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
                onAnalyzeMoveEntry={
                  copilotEnabled && onAnalyzeMoveEntry
                    ? (entryId) => onAnalyzeMoveEntry(entryId, day.dayIndex)
                    : undefined
                }
                itemLocks={itemLocks}
                userLockedItemIds={userLockedItemIds}
                onToggleUserLock={onToggleUserLock}
                selectedEntryId={selectedEntryId}
                onSelectEntry={onSelectEntry}
              />
              <ArrangeItineraryDayLodgingAnchor
                night={lodgingNight}
                lodgingListedInTimeline={day.timeline.some((entry) => entry.isLodging)}
                onAddLodging={onAddLodging ? () => onAddLodging(day.dayIndex) : undefined}
                onEditLodging={onEditLodging}
                onAskAssistant={
                  onAskAssistantForLodging
                    ? () => onAskAssistantForLodging(day.dayIndex)
                    : undefined
                }
              />
              <DayActions
                dayIndex={day.dayIndex}
                onAddActivity={onAddActivity}
                onAddLodging={onAddLodging}
                onInsertGap={onInsertGap}
                onMoreOperations={handleMoreOperations}
              />
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}

function DayActions({
  dayIndex,
  onAddActivity,
  onAddLodging,
  onInsertGap,
  onMoreOperations,
}: {
  dayIndex: number;
  onAddActivity?: (dayIndex: number) => void;
  onAddLodging?: (dayIndex: number) => void;
  onInsertGap?: (dayIndex: number) => void;
  onMoreOperations?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-md text-[11px]"
        onClick={() =>
          onAddActivity
            ? onAddActivity(dayIndex)
            : toast.message('添加活动待后端 placement 接口就绪')
        }
      >
        <Plus className="mr-1 h-3 w-3" />
        添加活动
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-md text-[11px]"
        onClick={() =>
          onAddLodging
            ? onAddLodging(dayIndex)
            : toast.message('请从当晚住宿卡片添加')
        }
      >
        <BedDouble className="mr-1 h-3 w-3" />
        添加住宿
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-md text-[11px]"
        onClick={() =>
          onInsertGap
            ? onInsertGap(dayIndex)
            : toast.message('插入空档待后端 gap 接口就绪')
        }
      >
        <Timer className="mr-1 h-3 w-3" />
        插入空档
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 rounded-md text-[11px] text-muted-foreground"
        onClick={onMoreOperations}
      >
        <MoreHorizontal className="mr-1 h-3 w-3" />
        更多操作
      </Button>
    </div>
  );
}
