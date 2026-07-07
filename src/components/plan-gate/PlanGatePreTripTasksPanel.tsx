import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { PlanGatePreTripTask, PlanGatePreTripTasks } from '@/types/plan-gate';
import { planGateCard, planGateSectionTitle } from './plan-gate-ui';

const PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function priorityClass(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-gate-reject-foreground bg-gate-reject/10 border-gate-reject-border/50';
    case 'medium':
      return 'text-gate-confirm-foreground bg-gate-confirm/10 border-gate-confirm-border/50';
    default:
      return 'text-muted-foreground bg-muted/30 border-border/60';
  }
}

export interface PlanGatePreTripTasksPanelProps {
  preTripTasks?: PlanGatePreTripTasks | null;
  loading?: boolean;
  compact?: boolean;
  title?: string;
  emptyMessage?: string;
  onViewAll?: () => void;
  className?: string;
}

function TaskRow({ task, compact }: { task: PlanGatePreTripTask; compact?: boolean }) {
  return (
    <li
      className={cn(
        'flex items-start justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-2',
        compact ? 'py-1.5' : '',
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-foreground">{task.title}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {task.category}
          {task.day != null ? ` · 第 ${task.day} 天` : ''}
          {task.source ? ` · ${task.source}` : ''}
        </p>
      </div>
      <Badge variant="outline" className={cn('shrink-0 text-[10px]', priorityClass(task.priority))}>
        {PRIORITY_LABEL[task.priority] ?? task.priority}
      </Badge>
    </li>
  );
}

export function PlanGatePreTripTasksPanel({
  preTripTasks,
  loading = false,
  compact = false,
  title = '行前准备任务',
  emptyMessage = '暂无待创建的行前任务',
  onViewAll,
  className,
}: PlanGatePreTripTasksPanelProps) {
  const total = preTripTasks?.total ?? 0;
  const highPriority = preTripTasks?.highPriority ?? 0;
  const tasks = preTripTasks?.tasks ?? [];
  const preview = compact ? tasks.slice(0, 3) : tasks.slice(0, 8);

  return (
    <div className={cn(planGateCard, className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className={planGateSectionTitle}>{title}</h4>
          {total > 0 ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              共 {total} 项
              {highPriority > 0 ? ` · ${highPriority} 项高优先级` : ''}
            </p>
          ) : null}
        </div>
        {onViewAll && total > preview.length ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onViewAll}>
            查看全部
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Spinner className="h-4 w-4" />
          加载行前任务…
        </div>
      ) : total === 0 ? (
        <p className="text-[11px] text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1.5">
          {preview.map((task) => (
            <TaskRow key={task.id} task={task} compact={compact} />
          ))}
        </ul>
      )}
    </div>
  );
}
