import { useMemo } from 'react';
import { AlertTriangle, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  isCollaborativeTaskAssigned,
  resolveCollaborativeTaskAssigneeLabel,
} from '@/lib/collab-task-assignee.util';
import { cn } from '@/lib/utils';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabTaskInsightsSidebarProps {
  tasks: CollaborativeTaskView[];
  onDiscussAssignment?: (message: string) => void;
}

function buildLoadMap(tasks: CollaborativeTaskView[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const task of tasks) {
    if (task.status === 'confirmed') continue;
    const label = resolveCollaborativeTaskAssigneeLabel(task) ?? '未分配';
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return map;
}

export function CollabTaskInsightsSidebar({
  tasks,
  onDiscussAssignment,
}: CollabTaskInsightsSidebarProps) {
  const pending = tasks.filter((t) => t.status === 'pending');
  const timedOut = tasks.filter((t) => t.status === 'timed_out');
  const loadMap = useMemo(() => buildLoadMap(tasks), [tasks]);
  const loads = [...loadMap.entries()].sort((a, b) => b[1] - a[1]);

  const maxLoad = loads[0]?.[1] ?? 1;
  const unassigned = pending.find((t) => !isCollaborativeTaskAssigned(t));
  const lightest = loads.filter(([name]) => name !== '未分配').at(-1);

  const aiSuggestion =
    unassigned && lightest
      ? `建议将「${unassigned.title}」分配给 ${lightest[0]}（当前负载较低）。`
      : pending.length > 0
        ? `有 ${pending.length} 项任务待确认，建议今日内完成对齐。`
        : '任务负载均衡，可按计划推进。';

  return (
    <div className="space-y-4">
      {(pending.length > 0 || timedOut.length > 0) && (
        <CollabWidgetCard title="任务洞察">
          <ul className="space-y-2 text-xs">
            {pending.slice(0, 2).map((task) => (
              <li key={task.id} className="flex gap-2 text-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-reject-foreground" />
                <span>
                  <span className="font-medium">{task.title}</span>
                  <span className="text-muted-foreground"> · 待确认</span>
                </span>
              </li>
            ))}
            {timedOut.slice(0, 1).map((task) => (
              <li key={task.id} className="flex gap-2 text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{task.title} · 已超时</span>
              </li>
            ))}
          </ul>
        </CollabWidgetCard>
      )}

      <CollabWidgetCard title="工作负载平衡">
        {loads.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无活跃任务负载。</p>
        ) : (
          <ul className="space-y-2">
            {loads.map(([name, count]) => {
              const pct = Math.round((count / Math.max(maxLoad, 1)) * 100);
              return (
                <li key={name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-foreground">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{count} 项</span>
                  </div>
                  <Progress
                    value={pct}
                    className={cn('h-1.5', pct >= 85 ? '[&>div]:bg-gate-reject-foreground' : '')}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CollabWidgetCard>

      <CollabWidgetCard title="AI 分配建议">
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gate-suggest-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">{aiSuggestion}</p>
        </div>
        {onDiscussAssignment && unassigned ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8 w-full text-xs"
            onClick={() => onDiscussAssignment(aiSuggestion)}
          >
            与 Nara 讨论分配
          </Button>
        ) : null}
      </CollabWidgetCard>
    </div>
  );
}
