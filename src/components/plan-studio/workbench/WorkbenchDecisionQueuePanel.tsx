import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  workbenchCard,
  workbenchListItemIdle,
  workbenchListItemSelected,
  workbenchPanelTitle,
} from './workbench-ui';

export interface WorkbenchDecisionQueuePanelProps {
  items: PlanningConflictItem[];
  selectedConflictId?: string | null;
  onSelectConflict?: (conflictId: string) => void;
  className?: string;
}

function priorityLabel(priority: PlanningConflictItem['priority']): string {
  if (priority === 'must_handle') return 'P0';
  if (priority === 'suggest_adjust') return 'P1';
  return 'P2';
}

function priorityBadgeClass(priority: PlanningConflictItem['priority']): string {
  if (priority === 'must_handle') {
    return 'border-gate-reject-border bg-gate-reject/30 text-gate-reject-foreground';
  }
  if (priority === 'suggest_adjust') {
    return 'border-gate-confirm-border bg-gate-confirm/25 text-gate-confirm-foreground';
  }
  return 'border-border/70 bg-muted text-muted-foreground';
}

/** 左侧 · 决策队列（设计稿样式） */
export function WorkbenchDecisionQueuePanel({
  items,
  selectedConflictId,
  onSelectConflict,
  className,
}: WorkbenchDecisionQueuePanelProps) {
  const pending = items.filter((item) => item.priority !== 'pending_confirm');

  return (
    <section className={cn('px-3 pt-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 className={workbenchPanelTitle}>决策队列</h3>
        {pending.length > 0 ? (
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-normal">
            {pending.length} 待决
          </Badge>
        ) : null}
      </div>

      {pending.length === 0 ? (
        <div className={cn(workbenchCard, 'px-3 py-4 text-center text-[11px] text-muted-foreground')}>
          当前没有待决冲突
        </div>
      ) : (
        <ul className="space-y-1.5">
          {pending.map((item) => {
            const selected = item.id === selectedConflictId;
            const dayLabel =
              item.affectedDays?.length === 1
                ? `Day ${item.affectedDays[0]}`
                : item.affectedDays?.length
                  ? `Day ${item.affectedDays.join('、')}`
                  : null;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectConflict?.(item.id)}
                  className={cn(
                    'flex w-full items-start gap-2',
                    selected ? workbenchListItemSelected : workbenchListItemIdle,
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      item.priority === 'must_handle'
                        ? 'text-gate-reject-foreground'
                        : 'text-gate-confirm-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={cn('rounded px-1 py-0 text-[9px] font-semibold', priorityBadgeClass(item.priority))}
                      >
                        {priorityLabel(item.priority)}
                      </Badge>
                    </div>
                    {dayLabel ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{dayLabel}</p>
                    ) : null}
                    {selected ? (
                      <Badge
                        variant="outline"
                        className="mt-1 rounded px-1.5 py-0 text-[9px] font-medium border-gate-confirm-border bg-gate-confirm/20 text-gate-confirm-foreground"
                      >
                        待决策
                      </Badge>
                    ) : null}
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                      {item.message}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
