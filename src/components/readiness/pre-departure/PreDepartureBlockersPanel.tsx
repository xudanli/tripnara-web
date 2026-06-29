import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchDecisionCheckerBadgeClass,
  workbenchPanelTitle,
  workbenchPreDepartureBlockerItem,
  workbenchPreDepartureBlockersShell,
  workbenchPrimaryAction,
} from '@/components/plan-studio/workbench/workbench-ui';

interface PreDepartureBlockersPanelProps {
  items: PlanningConflictItem[];
  loading?: boolean;
  onHandleConflict?: (conflictId: string) => void;
  onOpenFeasibility?: () => void;
  className?: string;
}

function priorityLabel(priority: PlanningConflictItem['priority']): string {
  if (priority === 'must_handle') return 'P0';
  if (priority === 'suggest_adjust') return 'P1';
  return 'P2';
}

export default function PreDepartureBlockersPanel({
  items,
  loading = false,
  onHandleConflict,
  onOpenFeasibility,
  className,
}: PreDepartureBlockersPanelProps) {
  const blockers = items.filter((item) => item.priority === 'must_handle');

  if (loading) {
    return (
      <section className={cn(workbenchCard, 'p-4', className)}>
        <p className="text-sm text-muted-foreground">加载可执行证明阻塞项…</p>
      </section>
    );
  }

  if (blockers.length === 0) return null;

  return (
    <section className={cn(workbenchPreDepartureBlockersShell, className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gate-reject-foreground" />
          <h3 className={workbenchPanelTitle}>
            可执行证明阻塞项 ({blockers.length})
          </h3>
        </div>
        {onOpenFeasibility ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenFeasibility}>
            查看全部
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {blockers.slice(0, 5).map((item) => {
          const dayLabel =
            item.affectedDays?.length === 1
              ? `Day ${item.affectedDays[0]}`
              : item.affectedDays?.length
                ? `Day ${item.affectedDays.join('、')}`
                : null;

          return (
            <li
              key={item.id}
              className={cn(
                workbenchPreDepartureBlockerItem,
                'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded px-1.5 py-0 text-[10px] font-semibold',
                      workbenchDecisionCheckerBadgeClass('danger'),
                    )}
                  >
                    {priorityLabel(item.priority)}
                  </Badge>
                  {dayLabel ? (
                    <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                  ) : null}
                  <span className="text-[10px] text-muted-foreground">{item.categoryLabel}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.message ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                ) : null}
              </div>
              {onHandleConflict ? (
                <Button
                  size="sm"
                  className={cn('h-8 shrink-0 rounded-lg text-xs', workbenchPrimaryAction)}
                  onClick={() => onHandleConflict(item.id)}
                >
                  去处理
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
