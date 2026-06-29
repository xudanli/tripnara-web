import { useMemo } from 'react';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import {
  COLLAB_TASK_FILTERS,
  countTasksByFilter,
  matchesCollabTaskFilter,
  taskFilterLabel,
  type CollabTaskFilter,
} from '@/lib/collab-task-filters';
import {
  workbenchCard,
  workbenchSegmentIdle,
  workbenchSegmentSelected,
  workbenchSoftPriorityClass,
} from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<CollaborativeTaskView['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  rolled_back: '已回滚',
  timed_out: '已超时',
};

const STATUS_PROGRESS: Record<CollaborativeTaskView['status'], number> = {
  pending: 35,
  confirmed: 100,
  rolled_back: 10,
  timed_out: 0,
};

function taskPriority(task: CollaborativeTaskView): '高' | '中' | '低' {
  if (task.status === 'pending') return '高';
  if (task.status === 'timed_out') return '高';
  return '中';
}

interface CollabTaskBoardTableProps {
  tasks: CollaborativeTaskView[];
  filter: CollabTaskFilter;
  onFilterChange: (filter: CollabTaskFilter) => void;
  className?: string;
}

export function CollabTaskBoardTable({
  tasks,
  filter,
  onFilterChange,
  className,
}: CollabTaskBoardTableProps) {
  const counts = useMemo(() => countTasksByFilter(tasks), [tasks]);

  const filtered = useMemo(
    () => tasks.filter((t) => matchesCollabTaskFilter(t, filter)),
    [tasks, filter],
  );

  return (
    <section className={cn(workbenchCard, 'p-4', className)} aria-label="任务看板">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">任务看板</h3>
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="任务筛选"
        >
          {COLLAB_TASK_FILTERS.map((f) => {
            const selected = filter === f.value;
            const count = counts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  'inline-flex min-h-[32px] items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] transition-colors',
                  selected ? workbenchSegmentSelected : workbenchSegmentIdle,
                )}
                onClick={() => onFilterChange(f.value)}
              >
                {f.label}
                <span
                  className={cn(
                    'tabular-nums',
                    selected ? 'opacity-90' : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {tasks.length === 0 ? '暂无协作任务。' : '当前筛选下没有任务，试试其他分类。'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">任务</th>
                <th className="pb-2 pr-3 font-medium">领域</th>
                <th className="pb-2 pr-3 font-medium">负责人</th>
                <th className="pb-2 pr-3 font-medium">优先级</th>
                <th className="pb-2 font-medium">进度</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const priority = taskPriority(task);
                return (
                  <tr key={task.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description ? (
                        <p className="mt-0.5 line-clamp-1 text-muted-foreground">{task.description}</p>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {taskFilterLabel(task)}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      {task.assigneeLabel ? (
                        <div className="flex items-center gap-1.5">
                          <CollaboratorAvatar displayName={task.assigneeLabel} size="xs" />
                          <span>{task.assigneeLabel}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">未分配</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] font-normal', workbenchSoftPriorityClass(priority))}
                      >
                        {priority}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex min-w-[100px] items-center gap-2">
                        <Progress value={STATUS_PROGRESS[task.status]} className="h-1.5 flex-1" />
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
