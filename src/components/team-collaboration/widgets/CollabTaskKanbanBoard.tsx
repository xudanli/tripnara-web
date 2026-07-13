import { useMemo } from 'react';
import { Calendar, ListChecks, Plus } from 'lucide-react';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  isCollaborativeTaskAssigned,
  resolveCollaborativeTaskAssigneeLabel,
} from '@/lib/collab-task-assignee.util';
import {
  KANBAN_COLUMNS,
  taskDomainLabel,
  taskDueHint,
  taskKanbanColumn,
  taskPriorityLevel,
  taskDomainFilter,
  taskProgressPct,
  type CollabTaskKanbanColumn,
} from '@/lib/collab-task-kanban.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { workbenchCard, workbenchSoftPriorityClass } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabTaskKanbanBoardProps {
  tasks: CollaborativeTaskView[];
  onAddTask?: (column: CollabTaskKanbanColumn) => void;
  className?: string;
}

function KanbanTaskCard({ task }: { task: CollaborativeTaskView }) {
  const priority = taskPriorityLevel(task);
  const domain = taskDomainFilter(task);
  const due = taskDueHint(task);
  const assignee = resolveCollaborativeTaskAssigneeLabel(task);
  const assigned = isCollaborativeTaskAssigned(task);
  const progress = taskProgressPct(task);
  const showProgress = taskKanbanColumn(task) === 'in_progress';

  return (
    <article className="rounded-lg border border-border/70 bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold leading-snug text-foreground">{task.title}</p>

      <div className="mt-2 flex items-center gap-2">
        {assigned && assignee ? (
          <CollaboratorAvatar displayName={assignee} size="xs" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
            ?
          </span>
        )}
        {due ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[10px]',
              due.overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
            )}
          >
            <Calendar className="h-3 w-3" />
            {due.label}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge
          variant="outline"
          className={cn('h-5 text-[9px] font-normal', workbenchSoftPriorityClass(priority))}
        >
          {priority}
        </Badge>
        <Badge variant="outline" className="h-5 text-[9px] font-normal">
          {taskDomainLabel(domain)}
        </Badge>
        <span className="ml-auto flex items-center gap-0.5 text-[9px] text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          {task.isSubTask ? '1/1' : '0/1'}
        </span>
      </div>

      {showProgress ? (
        <Progress value={progress} className="mt-2 h-1" />
      ) : null}
    </article>
  );
}

export function CollabTaskKanbanBoard({ tasks, onAddTask, className }: CollabTaskKanbanBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<CollabTaskKanbanColumn, CollaborativeTaskView[]> = {
      todo: [],
      in_progress: [],
      to_confirm: [],
      done: [],
    };
    for (const task of tasks) {
      map[taskKanbanColumn(task)].push(task);
    }
    return map;
  }, [tasks]);

  return (
    <section className={cn('overflow-x-auto', className)} aria-label="任务看板">
      <div className="flex min-w-[880px] gap-2 pb-1">
        {KANBAN_COLUMNS.map((column) => {
          const items = grouped[column.id];
          return (
            <div
              key={column.id}
              className={cn(workbenchCard, 'flex min-w-[210px] flex-1 flex-col overflow-hidden')}
            >
              <header className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
                <span className={cn('h-2 w-2 rounded-full', column.dotClass)} aria-hidden />
                <h3 className="text-xs font-semibold text-foreground">{column.label}</h3>
                <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <div className="flex min-h-[280px] flex-1 flex-col gap-1.5 p-1.5">
                {items.length === 0 ? (
                  <p className="py-6 text-center text-[10px] text-muted-foreground">暂无任务</p>
                ) : (
                  items.map((task) => <KanbanTaskCard key={task.id} task={task} />)
                )}

                {onAddTask ? (
                  <button
                    type="button"
                    className="mt-auto flex items-center justify-center gap-1 rounded-md border border-dashed border-border/70 py-2 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    onClick={() => onAddTask(column.id)}
                  >
                    <Plus className="h-3 w-3" />
                    添加任务
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
