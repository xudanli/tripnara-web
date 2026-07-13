import {
  Bed,
  Car,
  ChevronDown,
  Clock,
  Flame,
  Fuel,
  Lock,
  LockOpen,
  MoveHorizontal,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkbenchDaySnapshot } from './useWorkbenchItineraryData';
import type { ArrangeItemLocksResponse } from '@/types/arrange-itinerary';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { WorkbenchDayContextSummary } from '@/lib/workbench-timeline-impact.util';
import { useWorkbenchDecisionFocus } from '@/contexts/WorkbenchDecisionFocusContext';
import { isWorkbenchTimelineEntryHighlighted } from '@/lib/workbench-decision-focus.util';
import { WorkbenchCompactTravelConnector } from './WorkbenchCompactTravelConnector';
import { WorkbenchTimelineEntryBody } from './WorkbenchTimelineEntryBody';
import {
  formatWorkbenchDurationMinutes,
} from './workbench-format.util';
import {
  workbenchCard,
  workbenchConflictSurface,
  workbenchDecisionCheckerBadgeClass,
  workbenchLinkClass,
  workbenchPrimaryAction,
  workbenchScheduleConflictPanel,
  workbenchScheduleNoticeSurface,
  workbenchScheduleTimelineTime,
} from './workbench-ui';

export interface WorkbenchDayDetailCardProps {
  day: WorkbenchDaySnapshot;
  timeline?: WorkbenchDaySnapshot['timeline'];
  dayContext?: WorkbenchDayContextSummary;
  solutionCount?: number;
  memberCount?: number;
  decisionProblems?: DecisionProblemSummary[];
  onViewSolutions?: () => void;
  onDeferConflict?: () => void;
  canDeferConflict?: boolean;
  isConflictDismissed?: (conflictId: string) => boolean;
  onRestoreConflict?: (conflictId: string) => void;
  onViewDayMap?: () => void;
  /** 打开 EditItineraryItemDialog 编辑该 POI 项 */
  onEditEntry?: (entryId: string) => void;
  /** 删除行程项 */
  onDeleteEntry?: (entryId: string) => void;
  /** 分析移动影响（编排 P2） */
  onAnalyzeMoveEntry?: (entryId: string) => void;
  itemLocks?: ArrangeItemLocksResponse | null;
  userLockedItemIds?: Set<string>;
  onToggleUserLock?: (entryId: string, locked: boolean) => void;
  selectedEntryId?: string | null;
  onSelectEntry?: (entryId: string) => void;
  className?: string;
}

const CONFLICT_ICON: Record<string, LucideIcon> = {
  drive: Car,
  time: Clock,
  consecutive: Flame,
  lodging: Bed,
};

function pickConflictIcon(label: string): LucideIcon {
  if (label.includes('驾驶') || label.includes('车程')) return CONFLICT_ICON.drive!;
  if (label.includes('到达') || label.includes('时间')) return CONFLICT_ICON.time!;
  if (label.includes('连续')) return CONFLICT_ICON.consecutive!;
  if (label.includes('住宿')) return CONFLICT_ICON.lodging!;
  return Fuel;
}

/** 单日行程卡：当天上下文聚合 + 左时间轴 + 右冲突详情 */
export function WorkbenchDayDetailCard({
  day,
  timeline: timelineProp,
  dayContext,
  solutionCount = 0,
  memberCount = 0,
  decisionProblems = [],
  onViewSolutions,
  onDeferConflict,
  canDeferConflict = false,
  isConflictDismissed,
  onRestoreConflict,
  onViewDayMap,
  onEditEntry,
  onDeleteEntry,
  onAnalyzeMoveEntry,
  itemLocks,
  userLockedItemIds,
  onToggleUserLock,
  selectedEntryId = null,
  onSelectEntry,
  className,
}: WorkbenchDayDetailCardProps) {
  const decisionFocus = useWorkbenchDecisionFocus();
  const timeline = timelineProp ?? day.timeline;
  const panelConflictLines = day.conflictLines;
  const showConflictPanel = panelConflictLines.length > 0;
  const hasConflicts = day.conflictLines.length > 0;
  const hasDecisionProblems = decisionProblems.length > 0;
  const contextSummary = dayContext;

  const handleSelectEntry = (entryId: string, title: string, subtitle?: string) => {
    onSelectEntry?.(entryId);
    decisionFocus?.selectTimelineEntry({
      entryId,
      dayIndex: day.dayIndex,
      title,
      subtitle,
    });
  };

  const handleSelectConflictLine = (lineId: string) => {
    decisionFocus?.selectConflict({
      conflictId: lineId,
      dayIndex: day.dayIndex,
    });
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden',
        workbenchCard,
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/50 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            <span className="text-muted-foreground">第 {day.dayNumber} 天</span>
            <span className="mx-1.5 text-border" aria-hidden>
              ·
            </span>
            {day.dateLabel} {day.weekdayLabel}
          </h3>
          {!day.executable ? (
            <Badge
              variant="outline"
              className={cn(
                'rounded-full px-2 py-0 text-[10px] font-medium',
                workbenchDecisionCheckerBadgeClass('danger'),
              )}
            >
              当前不可执行
            </Badge>
          ) : contextSummary ? (
            <Badge
              variant="outline"
              className={cn(
                'rounded-full px-2 py-0 text-[10px] font-normal',
                contextSummary.statusTone === 'caution'
                  ? 'border-border/70 text-muted-foreground'
                  : workbenchDecisionCheckerBadgeClass('danger'),
              )}
            >
              {contextSummary.statusLabel}
            </Badge>
          ) : null}
          {day.dayDriveMinutes > 0 ? (
            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal text-muted-foreground">
              驾驶 {formatWorkbenchDurationMinutes(day.dayDriveMinutes)}
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onViewDayMap ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground"
              onClick={onViewDayMap}
            >
              当日地图
            </Button>
          ) : null}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-0.5 px-1.5 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-muted-foreground" />
              调整
              <ChevronDown className="h-2.5 w-2.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onViewSolutions}>查看修复方案</DropdownMenuItem>
            {canDeferConflict && onDeferConflict ? (
              <DropdownMenuItem onClick={onDeferConflict}>稍后处理</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {contextSummary?.mainReason || hasDecisionProblems ? (
        <div
          className={cn(
            workbenchScheduleNoticeSurface,
            'flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/40 px-3 py-1',
          )}
        >
          {contextSummary?.mainReason ? (
            <p className="line-clamp-1 text-[10px] leading-snug text-muted-foreground">
              {contextSummary.mainReason}
            </p>
          ) : null}
          {hasDecisionProblems ? (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                <ShieldAlert className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                本日 {decisionProblems.length} 项待决策
              </span>
              {onViewSolutions ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[10px] text-foreground underline-offset-2"
                  onClick={onViewSolutions}
                >
                  查看修复方案
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'grid min-h-0 flex-1',
          showConflictPanel
            ? 'grid-cols-1 md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.85fr)]'
            : 'grid-cols-1',
        )}
      >
        {/* 时间轴 */}
        <div
          className={cn(
            'min-h-0 min-w-0 overflow-y-auto px-3 py-2',
            showConflictPanel && 'border-b border-border/40 md:border-b-0 md:border-r md:pr-3',
          )}
        >
          {timeline.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">当天暂无行程安排</p>
          ) : (
            <ol className="grid grid-cols-[2.75rem_1.25rem_minmax(0,1fr)] gap-x-2">
              {timeline.map((entry, idx) => {
                const Icon = entry.icon;
                const isLast = idx === timeline.length - 1;
                const selected =
                  selectedEntryId === entry.id ||
                  (decisionFocus?.isTimelineEntryFocused(entry.id) ?? false);
                const focusHighlighted =
                  decisionFocus?.isActive && decisionFocus.focus.timelineEntryId !== entry.id
                    ? isWorkbenchTimelineEntryHighlighted(entry, decisionFocus.focus)
                    : false;
                const rowSurface = cn(
                  entry.splitGroupLabel && 'rounded-lg border border-border/50 bg-muted/15 px-1.5 py-1.5 -mx-0.5',
                  entry.isLodging && 'rounded-lg border border-gate-allow-border/40 bg-gate-allow/5 px-1.5 py-1 -mx-0.5',
                  selected && 'rounded-lg ring-2 ring-primary/30 bg-primary/5',
                  !selected && focusHighlighted && 'rounded-lg ring-1 ring-primary/20 bg-muted/20',
                );
                return (
                  <li key={entry.id} className="contents">
                    {entry.travelSegmentBefore ? (
                      <WorkbenchCompactTravelConnector segment={entry.travelSegmentBefore} />
                    ) : null}
                    <span className={cn(workbenchScheduleTimelineTime, 'pt-0.5 text-[10px]', rowSurface)}>
                      {entry.timeLabel}
                    </span>
                    <div className={cn('relative flex justify-center pt-0.5', rowSurface)}>
                      {!isLast ? (
                        <span
                          className="absolute left-1/2 top-5 bottom-0 w-px -translate-x-1/2 bg-border/80"
                          aria-hidden
                        />
                      ) : null}
                      <div className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/20">
                        <Icon className="h-3 w-3 text-muted-foreground/90" />
                      </div>
                    </div>
                    <div className={cn('min-w-0 pb-2.5 pt-0', rowSurface)}>
                        <WorkbenchTimelineEntryBody
                          entry={entry}
                          selected={selected}
                          onSelect={
                            onSelectEntry
                              ? () => handleSelectEntry(entry.id, entry.title, entry.subtitle)
                              : undefined
                          }
                          trailing={
                            <>
                              {onAnalyzeMoveEntry ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  aria-label={`分析移动 ${entry.title}`}
                                  onClick={() => onAnalyzeMoveEntry(entry.id)}
                                >
                                  <MoveHorizontal className="h-3 w-3" />
                                </Button>
                              ) : null}
                              {onToggleUserLock ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  aria-label={
                                    userLockedItemIds?.has(entry.id)
                                      ? `解锁 ${entry.title}`
                                      : `锁定 ${entry.title}`
                                  }
                                  onClick={() =>
                                    onToggleUserLock(entry.id, !userLockedItemIds?.has(entry.id))
                                  }
                                >
                                  {userLockedItemIds?.has(entry.id) ? (
                                    <Lock className="h-3 w-3" />
                                  ) : (
                                    <LockOpen className="h-3 w-3" />
                                  )}
                                </Button>
                              ) : null}
                              {onEditEntry ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  aria-label={`编辑 ${entry.title}`}
                                  onClick={() => onEditEntry(entry.id)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              ) : null}
                              {onDeleteEntry ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  aria-label={`删除 ${entry.title}`}
                                  onClick={() => onDeleteEntry(entry.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              ) : null}
                            </>
                          }
                        />
                        {itemLocks || userLockedItemIds ? (
                          <EntryLockHint
                            entryId={entry.id}
                            itemLocks={itemLocks}
                            userLockedItemIds={userLockedItemIds}
                          />
                        ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* 冲突详情 — 时间轴右侧 */}
        {showConflictPanel ? (
          <div className={cn(workbenchScheduleConflictPanel, 'min-h-0 overflow-y-auto p-2')}>
            <div className={workbenchConflictSurface}>
              <p className="mb-1.5 text-[11px] font-semibold text-foreground">
                冲突详情
                <span className="ml-1 font-normal text-muted-foreground">
                  ({panelConflictLines.length})
                </span>
              </p>
              <ul className="space-y-1.5 pb-0.5">
                {panelConflictLines.map((line) => {
                  const Icon = pickConflictIcon(line.label);
                  const dismissed = isConflictDismissed?.(line.id) ?? false;
                  const lineSelected = decisionFocus?.isConflictLineSelected(line.id) ?? false;
                  return (
                    <li key={line.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectConflictLine(line.id)}
                        className={cn(
                          'w-full rounded-md border px-2 py-1.5 text-left transition-colors',
                          lineSelected
                            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/50 bg-background/80 hover:bg-muted/30',
                        )}
                      >
                      <div className="flex items-start gap-1.5">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <p className="text-[11px] font-medium leading-snug text-foreground">
                              {line.label}
                            </p>
                            {dismissed ? (
                              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
                                已稍后处理
                              </Badge>
                            ) : null}
                            {line.severity === 'hard' ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'h-4 rounded-full px-1.5 text-[10px] font-medium',
                                  workbenchDecisionCheckerBadgeClass('danger'),
                                )}
                              >
                                硬冲突
                              </Badge>
                            ) : line.severity === 'soft' ? (
                              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal text-muted-foreground">
                                建议调整
                              </Badge>
                            ) : null}
                          </div>
                          {line.detail ? (
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                              {line.detail}
                            </p>
                          ) : null}
                          {dismissed && onRestoreConflict ? (
                            <button
                              type="button"
                              className={cn('mt-1 text-xs', workbenchLinkClass)}
                              onClick={() => onRestoreConflict(line.id)}
                            >
                              恢复显示
                            </button>
                          ) : null}
                        </div>
                        {line.delta ? (
                          <span className="shrink-0 font-mono-brand text-xs font-semibold tabular-nums text-error">
                            {line.delta}
                          </span>
                        ) : line.actionLabel ? (
                          <button
                            type="button"
                            className={cn('shrink-0 text-xs', workbenchLinkClass)}
                            onClick={line.onAction}
                          >
                            {line.actionLabel}
                          </button>
                        ) : null}
                      </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {memberCount > 0 ? (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(memberCount, 3) }, (_, i) => (
                    <span
                      key={i}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground"
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{memberCount} 位成员受影响</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasConflicts ? (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border/50 bg-card px-3 py-2">
          <Button
            className={cn('h-7 flex-1 rounded-md text-[11px] sm:flex-none sm:px-4', workbenchPrimaryAction)}
            onClick={onViewSolutions}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            查看解决方案{solutionCount > 0 ? ` (${solutionCount})` : ''}
          </Button>
          {canDeferConflict && onDeferConflict ? (
            <Button
              variant="outline"
              className="h-7 flex-1 rounded-md text-[11px] sm:flex-none sm:px-4"
              onClick={onDeferConflict}
            >
              稍后处理
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EntryLockHint({
  entryId,
  itemLocks,
  userLockedItemIds,
}: {
  entryId: string;
  itemLocks?: ArrangeItemLocksResponse | null;
  userLockedItemIds?: Set<string>;
}) {
  const isUserLocked = userLockedItemIds?.has(entryId);
  const isLocked = itemLocks?.lockedItems.some((item) => item.itemId === entryId);
  const isSemi = itemLocks?.semiLockedItems.some((item) => item.itemId === entryId);
  const isMust = itemLocks?.mustVisitItems.some((item) => item.itemId === entryId);
  if (!isUserLocked && !isLocked && !isSemi && !isMust) return null;
  const label = isUserLocked || isLocked ? '已锁定' : isSemi ? '半锁定' : '必去';
  return <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>;
}
