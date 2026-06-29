import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type {
  ReadinessPreparationTask,
  ReadinessTaskMember,
} from '@/lib/readiness-preparation-tasks';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import {
  PreDepartureColumnShell,
  AssigneeChip,
  priorityToP0P2,
  taskStatusMeta,
} from './pre-departure-column-ui';
import { cn } from '@/lib/utils';

const PREVIEW_LIMIT = 6;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function estimateDeadline(
  task: ReadinessPreparationTask,
  tripStartDate?: string | null,
): string | null {
  if (!tripStartDate) return null;
  try {
    const start = new Date(tripStartDate);
    const offset =
      task.priority === 'high' ? 14 : task.priority === 'medium' ? 7 : 3;
    const deadline = subDays(start, offset);
    return format(deadline, 'M月d日 (EEE)', { locale: zhCN });
  } catch {
    return null;
  }
}

function isTaskBlockedByConflict(
  task: ReadinessPreparationTask,
  conflicts: PlanningConflictItem[],
): boolean {
  if (task.completed || task.priority !== 'high') return false;
  const title = task.title.trim().toLowerCase();
  if (!title) return false;
  return conflicts.some((item) => {
    if (item.priority !== 'must_handle') return false;
    const hay = `${item.title} ${item.message}`.toLowerCase();
    return hay.includes(title) || title.includes(item.title.toLowerCase());
  });
}

interface PreDepartureTasksColumnProps {
  tasks: ReadinessPreparationTask[];
  members: ReadinessTaskMember[];
  tripStartDate?: string | null;
  planningConflicts?: PlanningConflictItem[];
  onViewAll?: () => void;
}

export default function PreDepartureTasksColumn({
  tasks,
  members,
  tripStartDate,
  planningConflicts = [],
  onViewAll,
}: PreDepartureTasksColumnProps) {
  const preview = useMemo(() => {
    return [...tasks]
      .filter((t) => !t.completed)
      .sort((a, b) => {
        const pr =
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
        return a.title.localeCompare(b.title, 'zh');
      })
      .slice(0, PREVIEW_LIMIT);
  }, [tasks]);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <PreDepartureColumnShell
      title="准备任务"
      footerLabel={pendingCount > 0 ? `查看全部任务 (${pendingCount})` : '查看全部任务'}
      onViewAll={onViewAll}
    >
      {preview.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">暂无待办任务</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">优先级</th>
                <th className="pb-2 pr-2 font-medium">任务</th>
                <th className="pb-2 pr-2 font-medium hidden sm:table-cell">负责人</th>
                <th className="pb-2 pr-2 font-medium hidden md:table-cell">截止</th>
                <th className="pb-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {preview.map((task) => {
                const p = priorityToP0P2(task.priority);
                const isBlocked = isTaskBlockedByConflict(task, planningConflicts);
                const status = taskStatusMeta(task, isBlocked);
                const assignee =
                  task.assigneeLabel ||
                  members.find((m) => m.userId === task.assigneeUserId)?.displayName ||
                  '我';
                const deadline = estimateDeadline(task, tripStartDate);

                return (
                  <tr key={task.id} className="align-middle">
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', p.className)}>
                        {p.label}
                      </Badge>
                    </td>
                    <td className="max-w-[120px] py-2 pr-2">
                      <span className="line-clamp-2 text-xs font-medium leading-snug">
                        {task.title}
                      </span>
                    </td>
                    <td className="py-2 pr-2 hidden sm:table-cell">
                      <AssigneeChip name={assignee} />
                    </td>
                    <td className="py-2 pr-2 text-[11px] tabular-nums text-muted-foreground hidden md:table-cell">
                      {deadline ?? '—'}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', status.className)}>
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PreDepartureColumnShell>
  );
}
