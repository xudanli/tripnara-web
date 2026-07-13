import { useMemo } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Download,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Button } from '@/components/ui/button';
import {
  isCollaborativeTaskAssigned,
  resolveCollaborativeTaskAssigneeLabel,
} from '@/lib/collab-task-assignee.util';
import { countTasksByOwner } from '@/lib/collab-task-kanban.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabTaskInsightsSidebarProps {
  tasks: CollaborativeTaskView[];
  collaborators?: readonly { userId: string; displayName?: string | null }[];
  selectedOwnerId?: string | null;
  onSelectOwner?: (userId: string | null) => void;
  onDiscussAssignment?: (message: string) => void;
  onAutoAssign?: () => void;
  onRemind?: () => void;
  onExport?: () => void;
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
  collaborators = [],
  selectedOwnerId,
  onSelectOwner,
  onDiscussAssignment,
  onAutoAssign,
  onRemind,
  onExport,
}: CollabTaskInsightsSidebarProps) {
  const overdue = tasks.filter((t) => t.status === 'timed_out');
  const loadMap = useMemo(() => buildLoadMap(tasks), [tasks]);
  const ownerRows = useMemo(
    () => countTasksByOwner(tasks, collaborators),
    [tasks, collaborators],
  );
  const heaviest = [...loadMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const unassigned = tasks.find((t) => !isCollaborativeTaskAssigned(t) && t.status !== 'confirmed');
  const lightestName = [...loadMap.entries()]
    .filter(([name]) => name !== '未分配')
    .sort((a, b) => a[1] - b[1])[0]?.[0];

  const aiSuggestions = [
    unassigned && lightestName
      ? `建议将「${unassigned.title}」分配给 ${lightestName}`
      : null,
    heaviest && heaviest[1] >= 3
      ? `${heaviest[0]} 任务负载较高（${heaviest[1]} 个）`
      : null,
    overdue.length > 0 ? `${overdue.length} 个任务已逾期，建议优先处理` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      <CollabWidgetCard title="按负责人筛选" compact>
        {ownerRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无负责人数据。</p>
        ) : (
          <ul className="space-y-1">
            {ownerRows.slice(0, 6).map((row) => {
              const selected =
                selectedOwnerId === row.userId ||
                (row.userId === 'unassigned' && selectedOwnerId === 'unassigned');
              return (
                <li key={row.userId}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40',
                    )}
                    onClick={() =>
                      onSelectOwner?.(row.userId === 'unassigned' ? 'unassigned' : row.userId)
                    }
                  >
                    {row.userId === 'unassigned' ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px]">
                        ?
                      </span>
                    ) : (
                      <CollaboratorAvatar displayName={row.displayName} size="xs" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{row.displayName}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {onSelectOwner ? (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-0.5 text-[10px] text-primary hover:underline"
            onClick={() => onSelectOwner(null)}
          >
            查看全部成员
            <ChevronRight className="h-3 w-3" />
          </button>
        ) : null}
      </CollabWidgetCard>

      <CollabWidgetCard title="任务洞察" compact>
        <ul className="space-y-2 text-xs">
          {overdue.length > 0 ? (
            <li className="flex gap-2 rounded-md border border-rose-200/80 bg-rose-50/50 px-2 py-1.5 dark:border-rose-900/50 dark:bg-rose-950/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span className="text-rose-800 dark:text-rose-300">{overdue.length} 个任务已逾期</span>
            </li>
          ) : null}
          {heaviest && heaviest[1] >= 2 ? (
            <li className="flex gap-2 rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="text-amber-900 dark:text-amber-200">
                {heaviest[0]} 任务负载较高（{heaviest[1]} 个）
              </span>
            </li>
          ) : null}
          {overdue.length === 0 && (!heaviest || heaviest[1] < 2) ? (
            <li className="text-muted-foreground">当前负载均衡，可按计划推进。</li>
          ) : null}
        </ul>
      </CollabWidgetCard>

      {aiSuggestions.length > 0 ? (
        <CollabWidgetCard title="AI 分配建议" compact>
          <ul className="space-y-1.5">
            {aiSuggestions.map((tip) => (
              <li key={tip} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          {onDiscussAssignment && unassigned ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 w-full text-[10px]"
              onClick={() => onDiscussAssignment(aiSuggestions[0] ?? '')}
            >
              应用建议
            </Button>
          ) : null}
        </CollabWidgetCard>
      ) : null}

      <CollabWidgetCard title="快速操作" compact>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg border border-border/60 px-2 py-2.5 text-[9px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            onClick={onAutoAssign}
          >
            <Wand2 className="h-4 w-4" />
            自动分配建议
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg border border-border/60 px-2 py-2.5 text-[9px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            onClick={onRemind}
          >
            <Bell className="h-4 w-4" />
            生成催办消息
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg border border-border/60 px-2 py-2.5 text-[9px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
            导出任务清单
          </button>
        </div>
      </CollabWidgetCard>
    </div>
  );
}
