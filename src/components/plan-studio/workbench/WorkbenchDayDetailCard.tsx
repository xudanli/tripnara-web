import {
  Bed,
  Car,
  ChevronDown,
  Clock,
  Flame,
  Fuel,
  Sparkles,
  Star,
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
import { workbenchCard, workbenchConflictSurface, workbenchHighlightStarIcon, workbenchPrimaryAction, workbenchScheduleConflictPanel, workbenchScheduleTimelineTime, workbenchSplitGroupLabelBadge } from './workbench-ui';

export interface WorkbenchDayDetailCardProps {
  day: WorkbenchDaySnapshot;
  solutionCount?: number;
  memberCount?: number;
  onViewSolutions?: () => void;
  onIgnoreConflict?: () => void;
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

/** 单日行程卡：左时间轴 + 右冲突详情（设计稿样式） */
export function WorkbenchDayDetailCard({
  day,
  solutionCount = 0,
  memberCount = 0,
  onViewSolutions,
  onIgnoreConflict,
  className,
}: WorkbenchDayDetailCardProps) {
  const hasConflicts = day.conflictLines.length > 0;

  return (
    <div
      className={cn(
        'flex min-h-[420px] flex-col overflow-hidden',
        workbenchCard,
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            <span className="text-muted-foreground">Day {day.dayNumber}</span>
            <span className="mx-1.5 text-border" aria-hidden>
              ·
            </span>
            {day.dateLabel} {day.weekdayLabel}
          </h3>
          {!day.executable ? (
            <Badge className="rounded-full border-gate-reject-border bg-gate-reject/30 px-2 py-0 text-[10px] font-medium text-gate-reject-foreground hover:bg-gate-reject/30">
              当前不可执行
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full border-gate-allow-border text-[10px] font-normal text-gate-allow-foreground">
              可执行
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              调整建议
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={onViewSolutions}>查看修复方案</DropdownMenuItem>
            <DropdownMenuItem onClick={onIgnoreConflict}>忽略当日冲突</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,38%)]">
        {/* 时间轴 */}
        <div className="min-h-0 min-w-0 overflow-y-auto border-b border-border/40 px-4 py-4 lg:border-b-0 lg:border-r">
          {day.timeline.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">当天暂无行程安排</p>
          ) : (
            <ol className="relative space-y-0 pl-1">
              {day.timeline.map((entry, idx) => {
                const Icon = entry.icon;
                const isLast = idx === day.timeline.length - 1;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      'relative flex gap-3 pb-5 last:pb-0',
                      entry.splitGroupLabel &&
                        'rounded-lg border border-gate-suggest-border/35 bg-gate-suggest/8 px-2 py-2 -mx-1',
                    )}
                  >
                    {!isLast ? (
                      <span
                        className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-border/80"
                        aria-hidden
                      />
                    ) : null}
                    <div className="relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/20">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/90" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className={workbenchScheduleTimelineTime}>
                          {entry.timeLabel}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-snug text-foreground break-words">
                            {entry.title}
                            {entry.splitGroupLabel ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'ml-1.5 rounded-full px-1.5 py-0 text-[10px] font-normal',
                                  workbenchSplitGroupLabelBadge,
                                  'border-gate-suggest-border/45 bg-gate-suggest/12 text-gate-suggest-foreground',
                                )}
                              >
                                {entry.splitGroupLabel}
                                {entry.splitPhaseLabel ? ` · ${entry.splitPhaseLabel}` : ''}
                              </Badge>
                            ) : null}
                            {entry.highlight ? (
                              <Star className={cn('ml-1 inline h-3 w-3', workbenchHighlightStarIcon)} />
                            ) : null}
                          </p>
                          {entry.subtitle ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.subtitle}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* 冲突详情 */}
        <div className={cn(workbenchScheduleConflictPanel, 'p-3')}>
          {hasConflicts ? (
            <div className={workbenchConflictSurface}>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gate-reject-foreground">
                冲突详情
              </p>
              <ul className="space-y-2.5">
                {day.conflictLines.map((line) => {
                  const Icon = pickConflictIcon(line.label);
                  return (
                    <li key={line.id} className="flex items-start gap-2 text-[11px]">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-reject-foreground/80" />
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug text-foreground/90">{line.label}</p>
                      </div>
                      {line.delta ? (
                        <span className="shrink-0 font-mono-brand text-[11px] font-semibold tabular-nums text-gate-reject-foreground">
                          {line.delta}
                        </span>
                      ) : line.actionLabel ? (
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
                          onClick={line.onAction}
                        >
                          {line.actionLabel}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/50 p-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              当天未发现硬冲突
            </div>
          )}

          {memberCount > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(memberCount, 3) }, (_, i) => (
                  <span
                    key={i}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground"
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{memberCount} 位成员受影响</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasConflicts ? (
        <div className="flex flex-wrap gap-2 border-t border-border/50 bg-muted/5 px-4 py-3">
          <Button
            className={cn('h-9 flex-1 rounded-lg text-xs sm:flex-none sm:px-5', workbenchPrimaryAction)}
            onClick={onViewSolutions}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            查看解决方案{solutionCount > 0 ? ` (${solutionCount})` : ''}
          </Button>
          <Button
            variant="outline"
            className="h-9 flex-1 rounded-lg text-xs sm:flex-none sm:px-5"
            onClick={onIgnoreConflict}
          >
            忽略冲突
          </Button>
        </div>
      ) : null}
    </div>
  );
}
